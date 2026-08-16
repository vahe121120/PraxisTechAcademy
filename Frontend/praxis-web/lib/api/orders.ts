import { request } from "@/lib/api/http";
import type { Order } from "@/lib/types";

export interface CreateOrderPayload {
  courseGroupId: string;
}

// Idempotent on the backend: resumes an existing unexpired order for the
// same student + course group instead of creating a duplicate.
export function createOrder(payload: CreateOrderPayload, accessToken: string) {
  return request<Order>("/orders", { method: "POST", body: payload, accessToken });
}

export function listMyOrders(accessToken: string) {
  return request<Order[]>("/orders/me", { accessToken });
}

export function getOrder(id: string, accessToken: string) {
  return request<Order>(`/orders/${id}`, { accessToken });
}

export function cancelOrder(id: string, accessToken: string) {
  return request<Order>(`/orders/${id}/cancel`, { method: "POST", accessToken });
}
