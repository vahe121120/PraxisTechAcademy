import { Injectable } from '@nestjs/common';
import { Currency, PaymentStatus, SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardStats,
  PopularCourse,
  RevenueByCurrency,
} from './interfaces/dashboard-stats.interface';

interface PopularCourseRow {
  id: string;
  title: string;
  enrollment_count: number;
}

const POPULAR_COURSES_LIMIT = 5;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const [
      totalStudents,
      activeSubscriptions,
      expiredSubscriptions,
      monthlyRevenue,
      popularCourses,
    ] = await Promise.all([
      this.countTotalStudents(),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.getMonthlyRevenue(),
      this.getPopularCourses(),
    ]);

    return {
      totalStudents,
      activeSubscriptions,
      expiredSubscriptions,
      monthlyRevenue,
      popularCourses,
    };
  }

  private countTotalStudents(): Promise<number> {
    // Excludes soft-deleted accounts (status: DELETED) — a "total
    // students" figure that includes accounts nobody can use or act on
    // wouldn't reflect anything an admin actually wants to know.
    return this.prisma.user.count({
      where: { role: UserRole.STUDENT, status: { not: UserStatus.DELETED } },
    });
  }

  /**
   * Grouped by currency deliberately — see the DashboardStats doc comment
   * for why summing AMD and USD into one number would be meaningless.
   * "Revenue" here means completed (SUCCEEDED) payments, not the value of
   * orders merely created — an unpaid or failed order was never revenue.
   *
   * `Payment` has neither an `amount` nor a `currency` column — both live
   * on `Order` (see the schema comment on `Order.subscriptionId` for why
   * they're modeled that way). Aggregating "revenue this month" therefore
   * needs `Payment.completedAt` (Order has no equivalent "paid at"
   * timestamp) joined to `Order.amount`/`Order.currency`. Prisma's
   * `groupBy` only operates on a model's own columns, not across a
   * relation, so this pulls the (at this business's scale, small) set of
   * matching rows and reduces them in application code rather than
   * reaching for raw SQL for what's fundamentally a simple sum.
   */
  private async getMonthlyRevenue(): Promise<RevenueByCurrency[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCEEDED,
        completedAt: { gte: startOfMonth },
      },
      select: { order: { select: { amount: true, currency: true } } },
    });

    const totals = new Map<Currency, number>();
    for (const payment of payments) {
      const current = totals.get(payment.order.currency) ?? 0;
      totals.set(payment.order.currency, current + payment.order.amount);
    }

    return Array.from(totals.entries()).map(([currency, amount]) => ({ currency, amount }));
  }

  /**
   * "Popular" = total historical enrollments per course (any Enrollment
   * status) — a cumulative demand signal, not just currently-active
   * subscriptions, which would understate a course that's run several
   * successful cohorts already completed. Expressed as raw SQL: this is a
   * two-hop aggregation (Course -> CourseGroup -> Enrollment) that
   * Prisma's query builder can't express as a single grouped query: its
   * `groupBy` only operates on a model's own columns, not a
   * multi-hop-relation count. The query has no dynamic/user-supplied
   * values, so there's no injection surface — the LIMIT is a fixed
   * server-side constant, not user input.
   */
  private async getPopularCourses(): Promise<PopularCourse[]> {
    const rows = await this.prisma.$queryRaw<PopularCourseRow[]>`
      SELECT c.id, c.title, COUNT(e.id)::int AS enrollment_count
      FROM courses c
      JOIN course_groups cg ON cg.course_id = c.id
      JOIN enrollments e ON e.course_group_id = cg.id
      GROUP BY c.id, c.title
      ORDER BY enrollment_count DESC
      LIMIT ${POPULAR_COURSES_LIMIT}
    `;

    return rows.map((row: PopularCourseRow) => ({
      courseId: row.id,
      title: row.title,
      enrollmentCount: row.enrollment_count,
    }));
  }
}
