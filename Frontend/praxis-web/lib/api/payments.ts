import { request } from "@/lib/api/http";
import type { Payment } from "@/lib/types";

export interface InitiatePaymentResult {
  redirectUrl: string;
  paymentId: string;
}

export function initiatePayment(orderId: string, accessToken: string) {
  return request<InitiatePaymentResult>(`/payments/${orderId}/initiate`, {
    method: "POST",
    accessToken,
  });
}

export interface PaymentStatusResult {
  status: Payment["status"];
  orderStatus: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED";
}

// Polled by /payment/return since the ARCA webhook confirming payment can
// arrive slightly before or after the browser redirect completes.
export function getPaymentStatus(orderId: string, accessToken: string) {
  return request<PaymentStatusResult>(`/payments/${orderId}/status`, { accessToken });
}
