import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseGroupStatus,
  CourseStatus,
  EnrollmentStatus,
  Order,
  OrderStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';

import { AppConfigService } from '../config/app-config.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { AdminQueryOrdersDto } from './dto/admin-query-orders.dto';
import { generateOrderNumber } from './utils/generate-order-number';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Step 1-2 of the payment flow: student selects a course group, backend
   * creates a PENDING Order. Idempotent in the common case — if the
   * student already has an unexpired PENDING order for this same course
   * group, that order is returned instead of creating a duplicate (avoids
   * orphaned orders from a double-click or an abandoned checkout retried
   * moments later).
   */
  async create(userId: string, courseGroupId: string): Promise<Order> {
    const courseGroup = await this.prisma.courseGroup.findUnique({
      where: { id: courseGroupId },
      include: { course: true },
    });

    if (!courseGroup || courseGroup.course.status !== CourseStatus.PUBLISHED) {
      // Same reasoning as the public course/course-group endpoints: don't
      // confirm the existence of something a student has no legitimate
      // reason to know about.
      throw new NotFoundException('Course group not found.');
    }
    if (courseGroup.status === CourseGroupStatus.CANCELLED) {
      throw new BadRequestException(
        'This course group has been cancelled and is no longer accepting payments.',
      );
    }

    const enrollment = await this.findOrCreatePayableEnrollment(userId, courseGroupId);

    const existingPendingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        courseGroupId,
        status: OrderStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPendingOrder) {
      return existingPendingOrder;
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const expiresAt = new Date(Date.now() + this.config.orderExpiryMinutes * 60_000);

    return this.prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        courseGroupId,
        subscriptionId: enrollment.subscription?.id ?? null,
        amount: courseGroup.course.monthlyPrice,
        currency: courseGroup.course.currency,
        status: OrderStatus.PENDING,
        periodStart,
        periodEnd,
        description: `${courseGroup.name} — monthly payment`,
        expiresAt,
      },
    });
  }

  async findById(id: string, requester: SafeUser): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.userId !== requester.id && requester.role !== UserRole.ADMIN) {
      // 404, not 403: a student has no legitimate reason to learn that an
      // order id belonging to someone else exists at all.
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  findMine(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(query: AdminQueryOrdersDto): Promise<PaginatedResult<Order>> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.courseGroupId ? { courseGroupId: query.courseGroupId } : {}),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** A student may cancel their own unpaid order; an admin may cancel any. Only PENDING orders are cancellable — a PAID order is a refund concern, not a cancellation. */
  async cancel(id: string, requester: SafeUser): Promise<Order> {
    const order = await this.findById(id, requester);

    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(`Cannot cancel an order with status ${order.status}.`);
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  /**
   * Extension point for a future scheduler sweep (per the original
   * architecture doc's SubscriptionSweepScheduler): marks unpaid orders
   * past their expiresAt as EXPIRED. Not wired to a cron in this module —
   * that belongs to the scheduler module — but implemented here since the
   * business rule belongs with the rest of Order's state machine.
   */
  async expireStaleOrders(): Promise<number> {
    const result = await this.prisma.order.updateMany({
      where: { status: OrderStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: OrderStatus.EXPIRED },
    });
    return result.count;
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async findOrCreatePayableEnrollment(
    userId: string,
    courseGroupId: string,
  ): Promise<{ id: string; subscription: { id: string; status: SubscriptionStatus } | null }> {
    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseGroupId: { userId, courseGroupId } },
      include: { subscription: true },
    });

    if (existing) {
      const sub = existing.subscription;
      if (
        sub &&
        sub.status === SubscriptionStatus.ACTIVE &&
        sub.currentPeriodEnd &&
        sub.currentPeriodEnd > new Date()
      ) {
        throw new ConflictException(
          `You are already enrolled and paid through ${sub.currentPeriodEnd.toISOString().slice(0, 10)}.`,
        );
      }
      if (existing.status === EnrollmentStatus.CANCELLED) {
        const reactivated = await this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: EnrollmentStatus.PENDING_PAYMENT, cancelledAt: null },
          include: { subscription: true },
        });
        return { id: reactivated.id, subscription: reactivated.subscription };
      }
      return { id: existing.id, subscription: existing.subscription };
    }

    const created = await this.prisma.enrollment.create({
      data: { userId, courseGroupId, status: EnrollmentStatus.PENDING_PAYMENT },
      include: { subscription: true },
    });
    return { id: created.id, subscription: created.subscription };
  }
}
