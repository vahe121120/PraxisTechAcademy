import { Module } from '@nestjs/common';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderExpirationScheduler } from './scheduler/order-expiration.scheduler';

@Module({
  controllers: [OrdersController],
  // OrderExpirationScheduler is discovered by the app-wide
  // `ScheduleModule.forRoot()` registered once in AppModule — see that
  // scheduler's own doc comment for why this runs on a short interval
  // rather than daily like SubscriptionExpirationScheduler.
  providers: [OrdersService, OrderExpirationScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
