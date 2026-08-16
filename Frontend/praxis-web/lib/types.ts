// Mirrors praxis-api response shapes exactly. Money fields are integers in
// minor units (e.g. AMD cents) — never floats. Divide by 100 only at the
// display edge; never store or compare the divided value.

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CourseGroupStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";

export type SubscriptionStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isSuspended: boolean;
  telegramLinked: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  track: string;
  summary: string;
  description: string;
  priceMinor: number;
  currency: string;
  durationWeeks: number;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseGroup {
  id: string;
  courseId: string;
  title: string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolledCount: number;
  status: CourseGroupStatus;
  telegramGroupId: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  studentId: string;
  courseGroupId: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string | null;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
}

export interface Subscription {
  id: string;
  studentId: string;
  courseId: string;
  courseGroupId: string;
  status: SubscriptionStatus;
  startedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  // Enriched client-side via lookups against /courses and /course-groups
  courseTitle?: string;
  courseGroupTitle?: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeSubscriptions: number;
  pendingOrders: number;
  revenueMinorThisMonth: number;
  currency: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface TokenPair {
  accessToken: string;
  expiresIn: number;
}
