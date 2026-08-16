import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SubscriptionExpirationScheduler } from './scheduler/subscription-expiration.scheduler';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  // TelegramModule exports the TELEGRAM_ACCESS_PORT binding —
  // SubscriptionsService injects it via @Inject(TELEGRAM_ACCESS_PORT)
  // without knowing or caring that TelegramService is the concrete
  // implementation behind it.
  imports: [OrdersModule, TelegramModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionExpirationScheduler],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
