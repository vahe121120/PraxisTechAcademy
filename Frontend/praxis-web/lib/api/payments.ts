import { request } from "@/lib/api/http";
import type { Order, Payment } from "@/lib/types";

export interface InitiatePaymentResult {
  paymentUrl: string;
}

// Route is POST /payments/initiate with `orderId` in the body — NOT
// /payments/:orderId/initiate — see PaymentsController.initiate /
// InitiatePaymentDto.
export function initiatePayment(orderId: string, accessToken: string) {
  return request<InitiatePaymentResult>("/payments/initiate", {
    method: "POST",
    body: { orderId },
    accessToken,
  });
}

export interface PaymentStatusResult {
  order: Order;
  latestPayment: Payment | null;
}

// Polled by /payment/return since the ARCA webhook confirming payment can
// arrive slightly before or after the browser redirect completes. Mirrors
// PaymentsController.getStatus exactly — there is no separate top-level
// `status`/`orderStatus` pair, just the order and its most recent payment
// attempt (order.status is the source of truth for "did this succeed").
export function getPaymentStatus(orderId: string, accessToken: string) {
  return request<PaymentStatusResult>(`/payments/${orderId}/status`, { accessToken });
}
