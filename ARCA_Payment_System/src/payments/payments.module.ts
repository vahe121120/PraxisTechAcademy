import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ArcaPaymentProvider } from './providers/arca-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ArcaPaymentProvider,
    // The only place in the codebase that knows which concrete gateway is
    // active. Swapping providers (a second bank, a different rail for
    // diaspora USD payments) means changing this one binding, never
    // touching PaymentsService.
    { provide: PAYMENT_PROVIDER, useClass: ArcaPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
