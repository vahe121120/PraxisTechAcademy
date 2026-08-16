import type { Currency } from '@prisma/client';

export interface CreatePaymentInput {
  /** Internal Order.id — never sent to the gateway itself, but useful for logging. */
  orderId: string;
  /** The human/merchant-facing order reference (Order.orderNumber) sent to the gateway. */
  orderNumber: string;
  /** Integer minor units — never a float. */
  amount: number;
  currency: Currency;
  description: string;
  /** Where the student's browser returns to after leaving the gateway's hosted page. */
  returnUrl: string;
}

export interface CreatePaymentResult {
  /** The gateway's own identifier for this order — the idempotency key stored on Payment.providerOrderId. */
  providerOrderId: string;
  /** The hosted payment page URL to redirect the student's browser to. */
  paymentUrl: string;
  /** The full raw gateway response, stored verbatim on Payment.rawGatewayResponse for audit/dispute resolution. */
  raw: unknown;
}

export type PaymentOutcomeStatus = 'SUCCEEDED' | 'FAILED' | 'PENDING' | 'UNKNOWN';

export interface VerifyPaymentInput {
  /** Exact raw request bytes, required for signature verification — a re-serialized JSON body will not necessarily match what the gateway signed. */
  rawBody: Buffer;
  /** The parsed body, for convenience once signature verification has already been performed against rawBody. */
  payload: Record<string, unknown>;
  /** The signature-bearing header or field name, gateway-specific (e.g. a header, or a field embedded in the payload like `p_sign`). */
  signature: string | undefined;
}

export interface VerifyPaymentResult {
  signatureValid: boolean;
  /** Null if the payload couldn't be parsed well enough to identify which order this callback is for. */
  providerOrderId: string | null;
  status: PaymentOutcomeStatus;
  /** Amount confirmed by the gateway, in minor units — compared against Order.amount by PaymentsService as an anomaly check. */
  amount?: number;
  currency?: Currency;
  approvalCode?: string;
  rrn?: string;
  cardMask?: string;
  cardBrand?: string;
  failureCode?: string;
  failureMessage?: string;
  raw: unknown;
}

export interface RefundPaymentInput {
  providerOrderId: string;
  /** Integer minor units — supports partial refunds; equal to the original charge for a full refund. */
  amount: number;
}

export interface RefundPaymentResult {
  success: boolean;
  raw: unknown;
}

/**
 * Every gateway-specific detail (endpoint paths, request/response shape,
 * signature scheme, credential format) lives behind this interface and
 * nowhere else. `PaymentsService` depends only on this — never on
 * `ArcaPaymentProvider` directly — via the `PAYMENT_PROVIDER` injection
 * token (see payment-provider.token.ts), so adding a second gateway later
 * (Idram, a card-on-file processor for diaspora USD payments, etc.) means
 * writing a new class that implements this interface, not touching
 * PaymentsService at all.
 */
export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
