import { Injectable, Logger } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';

import { AppConfigService } from '../../config/app-config.service';
import { PaymentGatewayError } from './payment-gateway.error';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentOutcomeStatus,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './payment-provider.interface';

// ISO 4217 numeric currency codes, as the register.do-style ArCa rail API
// expects them (three-digit string, zero-padded). Implemented as exhaustive
// switches rather than a Record lookup so the compiler enforces every
// Currency enum member is handled, with no possibility of an
// undefined-at-the-type-level indexed access.
function currencyToIsoNumeric(currency: Currency): string {
  switch (currency) {
    case Currency.AMD:
      return '051';
    case Currency.USD:
      return '840';
    default: {
      const exhaustiveCheck: never = currency;
      throw new PaymentGatewayError(`Unsupported currency for ARCA: ${String(exhaustiveCheck)}`);
    }
  }
}

function isoNumericToCurrency(code: string): Currency | undefined {
  switch (code) {
    case '051':
      return Currency.AMD;
    case '840':
      return Currency.USD;
    default:
      return undefined;
  }
}

/**
 * ============================================================================
 * IMPORTANT — THINGS THAT MUST BE CONFIRMED AGAINST THE REAL BANK API DOCS
 * ============================================================================
 * This implementation follows the general shape of the ArCa processing rail
 * used by most Armenian acquiring banks (Ameriabank, Ardshinbank, Inecobank,
 * ACBA, Idbank), modeled on the widely-used register.do /
 * getOrderStatusExtended.do / refund.do pattern common to this family of
 * bank gateways. Each bank issues its own merchant credentials and *may*
 * differ in specifics. Before going live, confirm with the specific issuing
 * bank's integration documentation:
 *   1. Exact endpoint paths (assumed: register.do, getOrderStatusExtended.do,
 *      refund.do, relative to ARCA_API_BASE_URL).
 *   2. Exact request parameter names and encoding (assumed: form-encoded,
 *      userName/password auth, amount in minor units).
 *   3. Exact response field names (assumed: orderId, formUrl, errorCode,
 *      errorMessage, orderStatus, actionCode, approvalCode, authRefNum, pan).
 *   4. The webhook callback's authenticity mechanism. Some banks on this
 *      rail send no trustworthy signature on the async callback at all —
 *      which is exactly why this class treats the inbound callback as a
 *      "check now" trigger rather than a source of truth: verifyPayment()
 *      always re-confirms the real status via a direct, authenticated
 *      server-to-server call (queryOrderStatus), regardless of what the
 *      HMAC check below concludes. If the specific bank does provide a
 *      real signature, tighten this further by rejecting outright on a
 *      signature mismatch instead of falling through to the status query.
 * ============================================================================
 */
@Injectable()
export class ArcaPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(ArcaPaymentProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const body = new URLSearchParams({
      userName: this.config.arcaMerchantLogin,
      password: this.config.arcaMerchantPassword,
      orderNumber: input.orderNumber,
      amount: String(input.amount),
      currency: currencyToIsoNumeric(input.currency),
      returnUrl: input.returnUrl,
      description: input.description.slice(0, 250),
    });

    const json = await this.post('register.do', body);

    const errorCode = this.readString(json, 'errorCode');
    if (errorCode && errorCode !== '0') {
      throw new PaymentGatewayError(
        `ARCA rejected order registration (errorCode=${errorCode}): ${this.readString(json, 'errorMessage') ?? 'no message'}`,
      );
    }

    const providerOrderId = this.readString(json, 'orderId');
    const paymentUrl = this.readString(json, 'formUrl');
    if (!providerOrderId || !paymentUrl) {
      throw new PaymentGatewayError(
        'ARCA order registration response was missing orderId/formUrl - response shape may not match this integration\u2019s assumptions.',
      );
    }

    return { providerOrderId, paymentUrl, raw: json };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const signatureValid = this.checkSignature(input.rawBody, input.signature);
    if (!signatureValid) {
      this.logger.warn(
        'ARCA webhook signature check failed - proceeding to authoritative status query anyway.',
      );
    }

    const providerOrderId =
      this.readString(input.payload, 'mdOrder') ?? this.readString(input.payload, 'orderId');

    if (!providerOrderId) {
      return {
        signatureValid,
        providerOrderId: null,
        status: 'UNKNOWN',
        raw: input.payload,
      };
    }

    // The webhook body is treated as a trigger, not a source of truth - the
    // real status always comes from this direct, authenticated call. See
    // the class-level doc comment for why.
    return this.queryOrderStatus(providerOrderId);
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const body = new URLSearchParams({
      userName: this.config.arcaMerchantLogin,
      password: this.config.arcaMerchantPassword,
      orderId: input.providerOrderId,
      amount: String(input.amount),
    });

    const json = await this.post('refund.do', body);
    const errorCode = this.readString(json, 'errorCode');
    const success = errorCode === '0';

    if (!success) {
      this.logger.error(
        `ARCA refund failed for order ${input.providerOrderId} (errorCode=${errorCode}): ${this.readString(json, 'errorMessage') ?? 'no message'}`,
      );
    }

    return { success, raw: json };
  }

  // -------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------

  private async queryOrderStatus(providerOrderId: string): Promise<VerifyPaymentResult> {
    const body = new URLSearchParams({
      userName: this.config.arcaMerchantLogin,
      password: this.config.arcaMerchantPassword,
      orderId: providerOrderId,
    });

    const json = await this.post('getOrderStatusExtended.do', body);

    const orderStatus = this.readNumber(json, 'orderStatus');
    const actionCode = this.readNumber(json, 'actionCode');
    const status = this.mapOrderStatus(orderStatus, actionCode);

    const amount = this.readNumber(json, 'amount');
    const currencyCode = this.readString(json, 'currency');

    return {
      signatureValid: true, // reaching this point means the credentialed status query itself succeeded
      providerOrderId,
      status,
      amount: amount ?? undefined,
      currency: currencyCode ? isoNumericToCurrency(currencyCode) : undefined,
      approvalCode: this.readString(json, 'approvalCode'),
      rrn: this.readString(json, 'authRefNum'),
      cardMask: this.readString(json, 'pan'),
      cardBrand: this.readString(json, 'cardBrand'),
      failureCode: actionCode !== undefined && actionCode !== 0 ? String(actionCode) : undefined,
      failureMessage: this.readString(json, 'actionCodeDescription') ?? undefined,
      raw: json,
    };
  }

  /**
   * orderStatus: 0=registered, 1=pre-authorized (held), 2=fully
   * deposited/captured (success), 3=reversed/cancelled, 4=refunded,
   * 5=ACS-authentication in progress, 6=declined - the conventional
   * meaning for this status field across ArCa-rail gateways. Confirm
   * against the specific bank's docs before relying on it in production.
   */
  private mapOrderStatus(
    orderStatus: number | undefined,
    actionCode: number | undefined,
  ): PaymentOutcomeStatus {
    if (orderStatus === 2) {
      return 'SUCCEEDED';
    }
    if (orderStatus === 3 || orderStatus === 6 || (actionCode !== undefined && actionCode !== 0)) {
      return 'FAILED';
    }
    if (orderStatus === 0 || orderStatus === 1 || orderStatus === 5) {
      return 'PENDING';
    }
    return 'UNKNOWN';
  }

  private checkSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }

    const expected = createHmac('sha256', this.config.arcaWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  private async post(path: string, body: URLSearchParams): Promise<Record<string, unknown>> {
    const url = `${this.config.arcaApiBaseUrl.replace(/\/+$/, '')}/${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.arcaRequestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        throw new PaymentGatewayError(
          `ARCA request to ${path} failed with HTTP ${response.status}: ${text.slice(0, 500)}`,
        );
      }

      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch (parseError) {
        throw new PaymentGatewayError(
          `ARCA response from ${path} was not valid JSON: ${text.slice(0, 500)}`,
          parseError,
        );
      }
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        throw error;
      }
      const isAbort = error instanceof Error && error.name === 'AbortError';
      throw new PaymentGatewayError(
        isAbort
          ? `ARCA request to ${path} timed out after ${this.config.arcaRequestTimeoutMs}ms`
          : `ARCA request to ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private readString(source: Record<string, unknown>, key: string): string | undefined {
    const value = source[key];
    return typeof value === 'string' ? value : undefined;
  }

  private readNumber(source: Record<string, unknown>, key: string): number | undefined {
    const value = source[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return undefined;
  }
}
