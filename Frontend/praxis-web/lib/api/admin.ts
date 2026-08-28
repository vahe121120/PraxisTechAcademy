import { request, toQueryString } from "@/lib/api/http";
import type {
  DashboardStats,
  PaginatedResult,
  Payment,
  SafeUser,
  Subscription,
} from "@/lib/types";

// AdminDashboardController is mounted at 'admin/dashboard', not 'admin/stats'.
export function getDashboardStats(accessToken: string) {
  return request<DashboardStats>("/admin/dashboard", { accessToken });
}

// Field names mirror SearchStudentsDto exactly (`search`, not `query`).
export interface SearchStudentsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function searchStudents(params: SearchStudentsParams, accessToken: string) {
  return request<PaginatedResult<SafeUser>>(`/admin/students${toQueryString(params)}`, {
    accessToken,
  });
}

export function getStudent(id: string, accessToken: string) {
  return request<SafeUser>(`/admin/students/${id}`, { accessToken });
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getStudentPayments(id: string, accessToken: string, params?: PaginationParams) {
  return request<PaginatedResult<Payment>>(
    `/admin/students/${id}/payments${toQueryString(params)}`,
    { accessToken },
  );
}

export function getStudentSubscriptions(
  id: string,
  accessToken: string,
  params?: PaginationParams,
) {
  return request<PaginatedResult<Subscription>>(
    `/admin/students/${id}/subscriptions${toQueryString(params)}`,
    { accessToken },
  );
}

// AdminStudentsController.suspend takes no request body at all — there is
// no "reason" field anywhere in the schema for it, so nothing is sent here.
// (A previous version of this client silently dropped a `reason` argument
// on the floor; removed rather than kept as dead, misleading UI.)
export function suspendStudent(id: string, accessToken: string) {
  return request<SafeUser>(`/admin/students/${id}/suspend`, { method: "POST", accessToken });
}

export function reactivateStudent(id: string, accessToken: string) {
  return request<SafeUser>(`/admin/students/${id}/reactivate`, { method: "POST", accessToken });
}

// ActivateSubscriptionDto accepts an optional expireDate override; omitted
// here since no admin UI currently exposes picking one (defaults to +1
// month server-side).
export function activateSubscription(id: string, accessToken: string) {
  return request<Subscription>(`/admin/subscriptions/${id}/activate`, {
    method: "POST",
    accessToken,
  });
}

export function deactivateSubscription(id: string, accessToken: string) {
  return request<Subscription>(`/admin/subscriptions/${id}/deactivate`, {
    method: "POST",
    accessToken,
  });
}
