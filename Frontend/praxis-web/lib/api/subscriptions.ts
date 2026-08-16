import { request } from "@/lib/api/http";
import type { Subscription } from "@/lib/types";

export function listMySubscriptions(accessToken: string) {
  return request<Subscription[]>("/subscriptions/me", { accessToken });
}

export function renewSubscription(id: string, accessToken: string) {
  return request<Subscription>(`/subscriptions/${id}/renew`, { method: "POST", accessToken });
}

export function cancelSubscription(id: string, accessToken: string) {
  return request<Subscription>(`/subscriptions/${id}/cancel`, { method: "POST", accessToken });
}
