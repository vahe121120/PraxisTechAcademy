import { request } from "@/lib/api/http";
import type { Order, Subscription } from "@/lib/types";

export function listMySubscriptions(accessToken: string) {
  return request<Subscription[]>("/subscriptions/me", { accessToken });
}

// Renewing is NOT an instant state change — SubscriptionsController.renew
// returns a new *Order* (CREATED, 201) that still has to be paid, exactly
// like a first-time enrollment. Callers must take the returned order and
// run it through the same initiatePayment()/redirect flow used for a fresh
// purchase — see components/subscription/SubscriptionCard.tsx.
export function renewSubscription(id: string, accessToken: string) {
  return request<Order>(`/subscriptions/${id}/renew`, { method: "POST", accessToken });
}

export function cancelSubscription(id: string, accessToken: string) {
  return request<Subscription>(`/subscriptions/${id}/cancel`, { method: "POST", accessToken });
}
