import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  Order,
  OrderStatus,
  Payment,
  PaymentProviderType,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import { AppConfigService } from '../config/app-config.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TELEGRAM_ACCESS_PORT, TelegramAccessPort } from '../telegram/telegram-access.port';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { PaymentGatewayError } from './providers/payment-gateway.error';
import {
  PaymentProvider,
  VerifyPaymentResult,
  CreatePaymentResult,
  RefundPaymentResult,
} from './providers/payment-provider.interface';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

const TERMINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly ordersService: OrdersService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    @Inject(TELEGRAM_ACCESS_PORT) private readonly telegramAccessPort: TelegramAccessPort,
  ) {}

  // ---------------------------------------------------------------------
  // Step 3: generate the ARCA payment URL
  // ---------------------------------------------------------------------

  async initiatePayment(
    orderId: string,
    requester: SafeUser,
  ): Promise<{ paymentUrl: string; payment: Payment }> {
    const order = await this.ordersService.findById(orderId, requester);

    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        `Cannot initiate payment for an order with status ${order.status}.`,
      );
    }
    if (order.expiresAt && order.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('This order has expired. Please create a new order.');
    }

    // Idempotent: reuse a still-outstanding attempt rather than registering
    // a second gateway order for the same Order (most gateways on this rail
    // reject a duplicate orderNumber registration anyway).
    const outstanding = await this.prisma.payment.findFirst({
      where: { orderId, status: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING] } },
      orderBy: { initiatedAt: 'desc' },
    });
    if (outstanding) {
      // The gateway doesn't hand back the hosted-page URL again on demand
      // in this design, so it's kept on the row itself for exactly this
      // case — see rawGatewayResponse, which always retains the original
      // createPayment() response.
      const paymentUrl = this.extractPaymentUrl(outstanding.rawGatewayResponse);
      if (paymentUrl) {
        return { paymentUrl, payment: outstanding };
      }
      // Fall through to registering a fresh attempt if the stored response
      // is missing the URL for some reason — better than a dead end.
    }

    const attemptNumber = (await this.prisma.payment.count({ where: { orderId } })) + 1;

    let result: CreatePaymentResult;
    try {
      result = await this.paymentProvider.createPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.amount,
        currency: order.currency,
        description: order.description ?? `Order ${order.orderNumber}`,
        returnUrl: this.config.arcaReturnUrl,
      });
    } catch (error) {
      this.logger.error(
        `Failed to register payment with gateway for order ${order.orderNumber}`,
        error instanceof Error ? error.stack : String(error),
      );
      if (error instanceof PaymentGatewayError) {
        throw new ServiceUnavailableException(
          'Unable to reach the payment gateway right now. Please try again shortly.',
        );
      }
      throw error;
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProviderType.ARCA,
        providerOrderId: result.providerOrderId,
        status: PaymentStatus.INITIATED,
        attemptNumber,
        rawGatewayResponse: result.raw as Prisma.InputJsonValue,
      },
    });

    return { paymentUrl: result.paymentUrl, payment };
  }

  async getStatus(
    orderId: string,
    requester: SafeUser,
  ): Promise<{ order: Order; latestPayment: Payment | null }> {
    const order = await this.ordersService.findById(orderId, requester);
    const latestPayment = await this.prisma.payment.findFirst({
      where: { orderId },
      orderBy: { initiatedAt: 'desc' },
    });
    return { order, latestPayment };
  }

  /**
   * Admin: every payment attempt (not just successful ones — a support
   * conversation about "why didn't my card work" needs the FAILED rows
   * too) for a specific student. `Payment` has no direct `userId` column
   * (see the schema comment on Order for why) — it's reached via
   * `Payment.order.userId`.
   */
  async findByUser(userId: string, page = 1, limit = 20): Promise<PaginatedResult<Payment>> {
    const where: Prisma.PaymentWhereInput = { order: { userId } };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { initiatedAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ---------------------------------------------------------------------
  // Steps 5-7: webhook receipt, verification, Order -> PAID
  // ---------------------------------------------------------------------

  /**
   * The raw payload is persisted to the append-only PaymentWebhookEvent
   * inbox *before* anything else — including before the (network-bound)
   * verification call — so a crash or a gateway outage mid-verification
   * never loses the fact that a callback arrived at all; it stays
   * inspectable and replayable via `processingError`/`processedAt` being
   * null.
   */
  async handleWebhook(
    rawBody: Buffer,
    payload: Record<string, unknown>,
    signature: string | undefined,
  ): Promise<void> {
    const webhookEvent = await this.prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProviderType.ARCA,
        payload: payload as unknown as Prisma.InputJsonValue,
        signature: signature ?? null,
        signatureValid: false,
      },
    });

    let result: VerifyPaymentResult;
    try {
      result = await this.paymentProvider.verifyPayment({ rawBody, payload, signature });
    } catch (error) {
      this.logger.error(
        `Webhook verification threw for event ${webhookEvent.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.markWebhookError(
        webhookEvent.id,
        `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Return normally (the controller responds 200): the gateway will
      // retry the callback, and this event is preserved for replay either
      // way. A 5xx response here risks the gateway disabling the merchant's
      // webhook after repeated failures on some implementations of this rail.
      return;
    }

    await this.prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { signatureValid: result.signatureValid },
    });

    if (!result.providerOrderId) {
      await this.markWebhookError(
        webhookEvent.id,
        'Callback did not contain a recognizable gateway order id.',
      );
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { providerOrderId: result.providerOrderId },
    });
    if (!payment) {
      await this.markWebhookError(
        webhookEvent.id,
        `No Payment row found for providerOrderId ${result.providerOrderId}.`,
      );
      return;
    }

    await this.prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { paymentId: payment.id },
    });

    // Idempotency: a retried callback for an already-terminal payment is a
    // clean no-op — banks retry callbacks, and this must tolerate that.
    if (TERMINAL_PAYMENT_STATUSES.includes(payment.status)) {
      await this.markWebhookProcessed(webhookEvent.id);
      return;
    }

    if (result.status === 'SUCCEEDED') {
      await this.applySuccessfulPayment(payment.id, result, webhookEvent.id);
    } else if (result.status === 'FAILED') {
      await this.applyFailedPayment(payment.id, result);
    }
    // PENDING/UNKNOWN: nothing to apply yet — a later callback or the
    // reconciliation sweep resolves it.

    await this.markWebhookProcessed(webhookEvent.id);
  }

  // ---------------------------------------------------------------------
  // Refunds
  // ---------------------------------------------------------------------

  async refund(orderId: string, amount: number): Promise<Payment> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException(`Cannot refund an order with status ${order.status}.`);
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: PaymentStatus.SUCCEEDED },
      orderBy: { completedAt: 'desc' },
    });
    if (!payment) {
      throw new NotFoundException('No succeeded payment found for this order to refund.');
    }
    if (amount > order.amount) {
      throw new ConflictException(
        `Refund amount (${amount}) cannot exceed the original charge (${order.amount}).`,
      );
    }

    let result: RefundPaymentResult;
    try {
      result = await this.paymentProvider.refundPayment({
        providerOrderId: payment.providerOrderId,
        amount,
      });
    } catch (error) {
      this.logger.error(
        `Refund request failed for payment ${payment.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Unable to reach the payment gateway to process the refund.',
      );
    }

    if (!result.success) {
      throw new ConflictException('The payment gateway declined the refund request.');
    }

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        rawGatewayResponse: result.raw as Prisma.InputJsonValue,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  /**
   * The full connected workflow requested for "ARCA payment succeeds":
   *   1. Confirm payment       — this method, below (Payment -> SUCCEEDED)
   *   2. Create subscription   — this method, below (Subscription created/extended)
   *   3. Find Telegram group   — TelegramService.grantAccess, called at the end of this method
   *   4. Generate invite link  — TelegramService.grantAccess
   *   5. Send Telegram message — TelegramService.grantAccess
   *   6. Save notification history — TelegramService.grantAccess
   * Steps 1-2 run inside one DB transaction (the billing state must be
   * atomic); steps 3-6 deliberately run *after* that transaction commits,
   * outside it — they involve slow, unreliable external HTTP calls to
   * Telegram, and a transaction must never be held open across those. See
   * TelegramService.grantAccess's own doc comment for the per-step
   * logging/error-handling on that half of the workflow.
   */
  private async applySuccessfulPayment(
    paymentId: string,
    result: VerifyPaymentResult,
    webhookEventId: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: true },
    });
    const { order } = payment;

    // Anomaly check: the gateway's confirmed amount must match what this
    // Order was actually created for. A mismatch here is a serious
    // integration bug or fraud signal, not something to silently accept —
    // refuse to mark the order paid and flag it for manual review instead.
    if (result.amount !== undefined && result.amount !== order.amount) {
      const message = `Amount mismatch on payment ${paymentId}: order=${order.amount}, gateway=${result.amount}. Not marking as paid.`;
      this.logger.error(message);
      await this.markWebhookError(webhookEventId, message);
      return;
    }

    // Step 1: confirm payment. Step 2: create subscription — both inside
    // the transaction below.
    const subscriptionId = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          approvalCode: result.approvalCode,
          rrn: result.rrn,
          cardMask: result.cardMask,
          cardBrand: result.cardBrand,
          rawGatewayResponse: result.raw as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } });

      if (order.subscriptionId) {
        // Renewal: extend the existing subscription by one billing period.
        await tx.subscription.update({
          where: { id: order.subscriptionId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            startDate: order.periodStart,
            expireDate: order.periodEnd,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: null, // system action, triggered by the gateway callback
            action: 'PAYMENT_SUCCEEDED',
            entityType: 'Order',
            entityId: order.id,
            after: { status: OrderStatus.PAID, amount: order.amount, currency: order.currency },
          },
        });

        return order.subscriptionId;
      }

      // First-time payment: create the Subscription now (step 8) and
      // link it back to both the Order and the Enrollment.
      const enrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseGroupId: { userId: order.userId, courseGroupId: order.courseGroupId },
        },
      });
      if (!enrollment) {
        // Should be unreachable — OrdersService.create always creates the
        // Enrollment before the Order — but fail loudly rather than
        // silently skip Subscription creation if it somehow is.
        throw new Error(
          `No Enrollment found for user ${order.userId} / course group ${order.courseGroupId} while finalizing payment for order ${order.id}.`,
        );
      }

      const subscription = await tx.subscription.create({
        data: {
          enrollmentId: enrollment.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: order.periodStart,
          expireDate: order.periodEnd,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { subscriptionId: subscription.id },
      });
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: EnrollmentStatus.ACTIVE },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: 'PAYMENT_SUCCEEDED',
          entityType: 'Order',
          entityId: order.id,
          after: { status: OrderStatus.PAID, amount: order.amount, currency: order.currency },
        },
      });

      return subscription.id;
    });

    this.logger.log(
      `[applySuccessfulPayment] Steps 1-2/6 OK — payment=${paymentId} order=${order.id} subscription=${subscriptionId}`,
    );

    // Deliberately outside the transaction: this is a slow, unreliable
    // external HTTP call (Telegram) — holding a DB transaction open across
    // it would risk long-lived locks and transaction timeouts. Wrapped so
    // a Telegram hiccup can never turn an already-successful payment into
    // an error response to the gateway's webhook. See
    // TelegramService.grantAccess for steps 3-6's own per-step logging.
    try {
      await this.telegramAccessPort.grantAccess({
        userId: order.userId,
        courseGroupId: order.courseGroupId,
        subscriptionId,
      });
    } catch (error) {
      // TelegramService.grantAccess already catches its own errors
      // internally and records them — this catch is a last-resort safety
      // net in case that contract is ever violated, not the primary
      // error-handling path.
      this.logger.error(
        `Unexpected error granting Telegram access after payment ${paymentId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async applyFailedPayment(paymentId: string, result: VerifyPaymentResult): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureCode: result.failureCode,
        failureMessage: result.failureMessage,
        rawGatewayResponse: result.raw as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    // The parent Order deliberately stays PENDING (not moved to a terminal
    // state) if it hasn't expired yet — a failed 3-D Secure attempt is
    // routinely followed by the student retrying with a different card
    // against the very same Order.
  }

  private async markWebhookProcessed(id: string): Promise<void> {
    await this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  private async markWebhookError(id: string, message: string): Promise<void> {
    await this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: { processingError: message.slice(0, 1000), processedAt: new Date() },
    });
  }

  private extractPaymentUrl(rawGatewayResponse: unknown): string | null {
    if (
      rawGatewayResponse &&
      typeof rawGatewayResponse === 'object' &&
      'formUrl' in rawGatewayResponse &&
      typeof (rawGatewayResponse as Record<string, unknown>).formUrl === 'string'
    ) {
      return (rawGatewayResponse as Record<string, unknown>).formUrl as string;
    }
    return null;
  }
}
