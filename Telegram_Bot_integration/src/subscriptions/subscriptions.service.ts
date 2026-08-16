import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AuditLog,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Order,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';

import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { AdminQuerySubscriptionsDto } from './dto/admin-query-subscriptions.dto';
import { TELEGRAM_ACCESS_PORT, TelegramAccessPort } from '../telegram/telegram-access.port';
import {
  SubscriptionResponse,
  SubscriptionWithContext,
  toSubscriptionResponse,
} from './interfaces/subscription-response.interface';

// Every read includes exactly the Enrollment context the response mapper
// needs to derive studentId/courseId — see subscription-response.interface.ts.
const SUBSCRIPTION_INCLUDE = {
  enrollment: {
    select: {
      userId: true,
      courseGroup: { select: { id: true, courseId: true } },
    },
  },
} as const;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    @Inject(TELEGRAM_ACCESS_PORT) private readonly telegramAccessPort: TelegramAccessPort,
  ) {}

  // ---------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------

  async findById(id: string, requester: SafeUser): Promise<SubscriptionResponse> {
    const subscription = await this.findRawOrThrow(id);

    if (subscription.enrollment.userId !== requester.id && requester.role !== UserRole.ADMIN) {
      // 404, not 403 — same reasoning applied throughout this codebase:
      // don't confirm a subscription belonging to someone else even exists.
      throw new NotFoundException('Subscription not found.');
    }

    return toSubscriptionResponse(subscription);
  }

  async findMine(userId: string): Promise<SubscriptionResponse[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { enrollment: { userId } },
      include: SUBSCRIPTION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toSubscriptionResponse);
  }

  async findAllAdmin(
    query: AdminQuerySubscriptionsDto,
  ): Promise<PaginatedResult<SubscriptionResponse>> {
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { enrollment: { userId: query.userId } } : {}),
      ...(query.courseGroupId ? { enrollment: { courseGroupId: query.courseGroupId } } : {}),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: SUBSCRIPTION_INCLUDE,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: rows.map(toSubscriptionResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------
  // Cancellation
  // ---------------------------------------------------------------------

  /**
   * Immediate, not "access continues until expireDate": the specified
   * business rule only describes a simple ACTIVE to EXPIRED expiration
   * flow with no grace/wind-down period, so cancellation is kept equally
   * simple — access ends the moment it's cancelled. (A "keep access until
   * period end" policy is a one-line change here later if the business
   * wants it; flagging the simplification rather than silently picking
   * one.)
   */
  async cancel(id: string, requester: SafeUser): Promise<SubscriptionResponse> {
    const subscription = await this.findRawOrThrow(id);

    if (subscription.enrollment.userId !== requester.id && requester.role !== UserRole.ADMIN) {
      throw new NotFoundException('Subscription not found.');
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new ConflictException(
        `Cannot cancel a subscription with status ${subscription.status}.`,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
      include: SUBSCRIPTION_INCLUDE,
    });

    await this.recordAudit(requester.id, 'SUBSCRIPTION_CANCELLED', updated.id, {
      status: SubscriptionStatus.CANCELLED,
    });

    await this.safeRevokeAccess({
      userId: updated.enrollment.userId,
      courseGroupId: updated.enrollment.courseGroup.id,
      subscriptionId: updated.id,
      reason: 'CANCELLED',
    });

    return toSubscriptionResponse(updated);
  }

  // ---------------------------------------------------------------------
  // Renewal
  // ---------------------------------------------------------------------

  /**
   * Translates a subscription-centric renewal request into the same
   * course-group-based order creation OrdersService already uses for a
   * first-time enrollment — deliberately reusing that logic rather than
   * duplicating the "is this actually renewable right now" business rule
   * in two places. If the subscription is still ACTIVE and not yet due,
   * OrdersService.create will itself refuse with a clear conflict message
   * ("already enrolled and paid through ...") — renewing early isn't
   * meaningful in a simple monthly model with no proration.
   */
  async initiateRenewal(id: string, requester: SafeUser): Promise<Order> {
    const subscription = await this.findRawOrThrow(id);

    if (subscription.enrollment.userId !== requester.id && requester.role !== UserRole.ADMIN) {
      throw new NotFoundException('Subscription not found.');
    }
    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new ConflictException(
        'This subscription was cancelled. Enroll again to start a new subscription.',
      );
    }
    if (subscription.status === SubscriptionStatus.PENDING) {
      throw new ConflictException(
        'This subscription has never been paid — use order creation, not renewal.',
      );
    }

    return this.ordersService.create(
      subscription.enrollment.userId,
      subscription.enrollment.courseGroup.id,
    );
  }

  // ---------------------------------------------------------------------
  // Expiration checker — driven by SubscriptionExpirationScheduler
  // ---------------------------------------------------------------------

  /**
   * "Every day at 02:00: check expired subscriptions. If expired: status =
   * EXPIRED." — the actual query is `status = ACTIVE AND expireDate <=
   * now`, powered by the `[status, expireDate]` composite index on
   * Subscription. Processed row-by-row (not a bulk `updateMany`) because
   * each expiration also needs its own Telegram-revocation side effect and
   * audit/notification trail — at this business's current scale (a few
   * hundred active subscriptions at most for the foreseeable future) this
   * is more than fast enough for a once-a-day batch job; revisit with
   * batching/a queue if that scale assumption changes materially.
   */
  async expireOverdueSubscriptions(): Promise<{ checked: number; expired: number }> {
    const overdue = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, expireDate: { lte: new Date() } },
      include: SUBSCRIPTION_INCLUDE,
    });

    let expiredCount = 0;
    for (const subscription of overdue) {
      try {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });

        await this.recordAudit(null, 'SUBSCRIPTION_EXPIRED', subscription.id, {
          status: SubscriptionStatus.EXPIRED,
          expireDate: subscription.expireDate,
        });

        await this.queueExpirationNotification(subscription.enrollment.userId, subscription.id);

        await this.safeRevokeAccess({
          userId: subscription.enrollment.userId,
          courseGroupId: subscription.enrollment.courseGroup.id,
          subscriptionId: subscription.id,
          reason: 'EXPIRED',
        });

        expiredCount += 1;
      } catch (error) {
        // One bad row must never abort the whole sweep — log and continue
        // so every other genuinely-overdue subscription still gets
        // processed today; a failed one is simply picked up again
        // tomorrow (it's still ACTIVE and still overdue).
        this.logger.error(
          `Failed to expire subscription ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { checked: overdue.length, expired: expiredCount };
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async findRawOrThrow(id: string): Promise<SubscriptionWithContext> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: SUBSCRIPTION_INCLUDE,
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }
    return subscription;
  }

  /**
   * Access-revocation must never fail the operation that triggered it —
   * the billing state change (EXPIRED/CANCELLED) is the authoritative fact
   * regardless of whether the downstream Telegram side effect succeeds.
   */
  private async safeRevokeAccess(
    input: Parameters<TelegramAccessPort['revokeAccess']>[0],
  ): Promise<void> {
    try {
      await this.telegramAccessPort.revokeAccess(input);
    } catch (error) {
      this.logger.error(
        `Telegram access revocation failed for subscription ${input.subscriptionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async queueExpirationNotification(userId: string, subscriptionId: string): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.SUBSCRIPTION_EXPIRED,
          status: NotificationStatus.PENDING,
          metadata: { subscriptionId },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to queue expiration notification for subscription ${subscriptionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async recordAudit(
    actorUserId: string | null,
    action: string,
    subscriptionId: string,
    after: Record<string, unknown>,
  ): Promise<AuditLog | void> {
    try {
      return await this.prisma.auditLog.create({
        data: { actorUserId, action, entityType: 'Subscription', entityId: subscriptionId, after },
      });
    } catch (error) {
      this.logger.error(
        'Failed to write audit log entry',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
