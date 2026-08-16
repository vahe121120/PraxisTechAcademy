import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { NoopTelegramAccessProvider } from './integrations/noop-telegram-access.provider';
import { TELEGRAM_ACCESS_PORT } from './integrations/telegram-access.port';
import { SubscriptionExpirationScheduler } from './scheduler/subscription-expiration.scheduler';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [OrdersModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionExpirationScheduler,
    NoopTelegramAccessProvider,
    // The one line to change once a real TelegramModule exists — nothing
    // in SubscriptionsService needs to change at all. See
    // telegram-access.port.ts for the full explanation of this seam.
    { provide: TELEGRAM_ACCESS_PORT, useClass: NoopTelegramAccessProvider },
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
