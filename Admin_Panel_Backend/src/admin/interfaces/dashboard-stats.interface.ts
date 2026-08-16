import type { Currency } from '@prisma/client';

export interface RevenueByCurrency {
  currency: Currency;
  amount: number; // integer minor units, matching the money convention used everywhere else
}

export interface PopularCourse {
  courseId: string;
  title: string;
  enrollmentCount: number;
}

export interface DashboardStats {
  totalStudents: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  /**
   * An array, not a single number: this business supports both AMD and
   * USD (see Course.currency), and summing two different currencies into
   * one figure would be meaningless — "1,500,300" of what? Each entry is
   * this calendar month's revenue for one currency.
   */
  monthlyRevenue: RevenueByCurrency[];
  popularCourses: PopularCourse[];
}
