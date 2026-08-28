import type { Payment } from '@prisma/client';

export interface PaymentWithOrderAmount extends Payment {
  order: {
    amount: number;
    currency: string;
  };
}

/**
 * `Payment` itself has neither an `amount` nor a `currency` column — both
 * live on the parent `Order` (see the schema comment on Payment) — but an
 * admin reviewing a student's payment history needs to see how much each
 * attempt was for without a second round trip per row. This flattens those
 * two fields in from the already-joined `order` relation, the same
 * flattening pattern used by `toCourseGroupResponse` (telegramGroupId) and
 * `toSubscriptionResponse` (studentId/courseId).
 */
export interface PaymentResponse {
  id: string;
  orderId: string;
  provider: Payment['provider'];
  providerOrderId: string;
  status: Payment['status'];
  attemptNumber: number;
  approvalCode: string | null;
  rrn: string | null;
  cardMask: string | null;
  cardBrand: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  initiatedAt: Date;
  completedAt: Date | null;
  amount: number;
  currency: string;
}

export function toPaymentResponse(payment: PaymentWithOrderAmount): PaymentResponse {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    providerOrderId: payment.providerOrderId,
    status: payment.status,
    attemptNumber: payment.attemptNumber,
    approvalCode: payment.approvalCode,
    rrn: payment.rrn,
    cardMask: payment.cardMask,
    cardBrand: payment.cardBrand,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    initiatedAt: payment.initiatedAt,
    completedAt: payment.completedAt,
    amount: payment.order.amount,
    currency: payment.order.currency,
  };
}
