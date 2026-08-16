import { request, toQueryString } from "@/lib/api/http";
import type { DashboardStats, Payment, SafeUser, Subscription, PaginatedResult } from "@/lib/types";

export function getDashboardStats(accessToken: string) {
  return request<DashboardStats>("/admin/stats", { accessToken });
}

export interface SearchStudentsParams {
  query?: string;
  page?: number;
  pageSize?: number;
}

export function searchStudents(params: SearchStudentsParams, accessToken: string) {
  return request<PaginatedResult<SafeUser>>(`/admin/students${toQueryString(params)}`, {
    accessToken,
  });
}

export function getStudent(id: string, accessToken: string) {
  return request<SafeUser>(`/admin/students/${id}`, { accessToken });
}

export function getStudentPayments(id: string, accessToken: string) {
  return request<Payment[]>(`/admin/students/${id}/payments`, { accessToken });
}

export function getStudentSubscriptions(id: string, accessToken: string) {
  return request<Subscription[]>(`/admin/students/${id}/subscriptions`, { accessToken });
}

export function suspendStudent(id: string, accessToken: string, reason?: string) {
  return request<SafeUser>(`/admin/students/${id}/suspend`, {
    method: "POST",
    body: reason ? { reason } : undefined,
    accessToken,
  });
}

export function reactivateStudent(id: string, accessToken: string) {
  return request<SafeUser>(`/admin/students/${id}/reactivate`, { method: "POST", accessToken });
}

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
