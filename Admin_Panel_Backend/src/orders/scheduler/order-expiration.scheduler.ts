import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OrdersService } from '../orders.service';

/**
 * Sweeps unpaid Orders past their `expiresAt` window and marks them
 * EXPIRED. `OrdersService.expireStaleOrders()` already implements the rule
 * (see its own doc comment) — this class only owns *scheduling* it, same
 * split as `SubscriptionExpirationScheduler`/`SubscriptionsService`.
 *
 * Runs every 15 minutes rather than once a day: unlike subscription
 * expiration (a slow, once-daily business event), an Order's `expiresAt`
 * window is typically ~30 minutes (see `ORDER_EXPIRY_MINUTES`), so a
 * once-a-day sweep would leave newly-expired orders visibly stuck in
 * PENDING for up to 24 hours — long enough to confuse both students
 * (checkout page shows a "pending" order they can no longer pay) and
 * admins reviewing the orders list. A short interval keeps that window
 * tight without needing a queue for what's a cheap, idempotent
 * `updateMany` against an indexed column.
 */
@Injectable()
export class OrderExpirationScheduler {
  private readonly logger = new Logger(OrderExpirationScheduler.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'order-expiration-check',
    timeZone: 'Asia/Yerevan',
  })
  async handleExpirationSweep(): Promise<void> {
    try {
      const expiredCount = await this.ordersService.expireStaleOrders();
      if (expiredCount > 0) {
        this.logger.log(`Order expiration sweep: ${expiredCount} order(s) marked EXPIRED.`);
      }
    } catch (error) {
      // A single bad sweep must never crash the scheduler process — log
      // and let the next scheduled run pick up whatever is still overdue.
      this.logger.error(
        'Order expiration sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
