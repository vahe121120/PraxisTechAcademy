import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Order, Payment, UserRole } from '@prisma/client';
import { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentsService } from './payments.service';

// Header the callback's signature is expected under. Flagged in
// ArcaPaymentProvider's class doc comment as needing confirmation against
// the specific bank's actual integration — some banks on this rail embed
// the signature/checksum as a field in the POST body instead of a header,
// which is why the payload itself is also handed to verifyPayment() rather
// than only this header.
const ARCA_SIGNATURE_HEADER = 'x-arca-signature';

@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  async initiate(
    @CurrentUser() user: SafeUser,
    @Body() dto: InitiatePaymentDto,
  ): Promise<{ paymentUrl: string }> {
    const { paymentUrl } = await this.paymentsService.initiatePayment(dto.orderId, user);
    return { paymentUrl };
  }

  @Get(':orderId/status')
  getStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<{ order: Order; latestPayment: Payment | null }> {
    return this.paymentsService.getStatus(orderId, user);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post(':orderId/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.refund(orderId, dto.amount);
  }

  /**
   * Server-to-server callback from ARCA — never requires a JWT (the bank
   * isn't a logged-in user), authenticated instead via signature
   * verification inside PaymentsService/ArcaPaymentProvider. Always
   * responds 200 once the payload is structurally acceptable, even when
   * verification or processing fails internally (see PaymentsService's
   * doc comment on handleWebhook for why: a non-2xx response here risks
   * the gateway disabling the merchant's webhook after repeated failures
   * on some implementations of this rail — the failure is instead
   * recorded in PaymentWebhookEvent for investigation/replay).
   */
  @Public()
  @Post('arca/webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    if (!req.rawBody) {
      // Should be unreachable — `rawBody: true` is set on the Nest app in
      // main.ts specifically so this is always populated — but this is the
      // one endpoint in the whole API where its absence would silently
      // defeat signature verification, so it's asserted explicitly rather
      // than assumed.
      this.logger.error(
        'Webhook received with no raw body captured — check NestFactory rawBody configuration.',
      );
      throw new BadRequestException('Malformed request.');
    }

    const payload = req.body as unknown;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Malformed webhook payload.');
    }

    const signature =
      req.header(ARCA_SIGNATURE_HEADER) ??
      (typeof (payload as Record<string, unknown>).signature === 'string'
        ? ((payload as Record<string, unknown>).signature as string)
        : undefined);

    await this.paymentsService.handleWebhook(
      req.rawBody,
      payload as Record<string, unknown>,
      signature,
    );

    return { received: true };
  }
}
