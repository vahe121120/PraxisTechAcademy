// Mirrors praxis-api (Admin_Panel_Backend) response shapes exactly — see
// the corresponding Prisma models / DTOs / response-mapper interfaces in
// Admin_Panel_Backend/src for the source of truth each type below is
// derived from. Money fields are integers in minor units (e.g. AMD cents)
// — never floats. Divide by 100 only at the display edge (lib/money.ts);
// never store or compare the divided value.
//
// Dates are typed as `string` (ISO 8601) throughout, matching what actually
// arrives over JSON — the backend's `Date` fields are serialized to strings
// by the time they reach the browser; there is no runtime `Date` here.

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type CourseTrack = "FUNDAMENTALS" | "PROFESSION" | "COMBINED" | "MINI";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CourseGroupStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type SubscriptionStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

// See Admin_Panel_Backend/src/users/interfaces/safe-user.interface.ts
// (toSafeUser) — this is exactly what every endpoint returning a user
// exposes, and nothing more.
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  telegramUsername: string | null;
  role: Role;
  status: UserStatus;
  locale: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModuleItem {
  id?: string;
  title: string;
  description: string;
  topics: string[];
}

export interface CourseProjectItem {
  title: string;
  description: string;
  tech?: string[];
}

// Raw Prisma `Course` row, as returned unmapped by CoursesController,
// extended with optional rich curriculum / marketing fields.
export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  track: CourseTrack;
  monthlyPrice: number;
  currency: string;
  durationDays: number;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;

  // Optional rich metadata & curriculum
  shortDescription?: string;
  level?: "Beginner" | "Intermediate" | "Advanced" | string;
  format?: string;
  language?: string;
  schedule?: string;
  certificate?: boolean | string;
  prerequisites?: string[];
  learningOutcomes?: string[];
  targetAudience?: string[];
  projects?: CourseProjectItem[];
  modules?: CourseModuleItem[];
}

// See Admin_Panel_Backend/src/course-groups/interfaces/course-group-response.interface.ts
// (toCourseGroupResponse). Note there is no `enrolledCount` — the API does
// not expose a live enrollment count for a course group.
export interface CourseGroup {
  id: string;
  courseId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  schedule: string;
  teacherId: string | null;
  capacity: number | null;
  status: CourseGroupStatus;
  telegramGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Raw Prisma `Order` row, as returned unmapped by OrdersController.
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  courseGroupId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: OrderStatus;
  periodStart: string;
  periodEnd: string;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
}

// Raw Prisma `Payment` row. `amount`/`currency` are NOT columns on this
// model in the backend schema — they live on `Order` — so they're only
// ever present here when the endpoint explicitly joins and flattens them
// (see AdminStudentsController's payments endpoint). Treat as optional.
export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId: string;
  status: PaymentStatus;
  attemptNumber: number;
  approvalCode: string | null;
  rrn: string | null;
  cardMask: string | null;
  cardBrand: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: string;
  completedAt: string | null;
  /** Flattened in from the related Order — see the admin payments endpoint. */
  amount?: number;
  /** Flattened in from the related Order — see the admin payments endpoint. */
  currency?: string;
}

// See Admin_Panel_Backend/src/subscriptions/interfaces/subscription-response.interface.ts
// (toSubscriptionResponse).
export interface Subscription {
  id: string;
  studentId: string;
  courseGroupId: string;
  courseId: string;
  status: SubscriptionStatus;
  startDate: string | null;
  expireDate: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Enriched client-side via lookups against /courses and /course-groups —
  // the API response itself only carries ids.
  courseTitle?: string;
  courseGroupTitle?: string;
}

// See Admin_Panel_Backend/src/admin/interfaces/dashboard-stats.interface.ts.
export interface RevenueByCurrency {
  currency: string;
  amount: number;
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
  monthlyRevenue: RevenueByCurrency[];
  popularCourses: PopularCourse[];
}

// See Admin_Panel_Backend/src/common/interfaces/paginated-result.interface.ts.
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// /auth/register, /auth/login, /auth/refresh all return exactly
// `{ user, accessToken }` — the refresh token itself is never in the JSON
// body, only in the httpOnly cookie the backend sets alongside it.
export interface TokenPair {
  accessToken: string;
}
