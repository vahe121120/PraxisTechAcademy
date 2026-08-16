import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SubscriptionsService } from '../subscriptions.service';

/**
 * "Every day at 02:00: check expired subscriptions. If expired: status =
 * EXPIRED." 02:00 is chosen deliberately as a low-traffic hour (Yerevan
 * time, matching the server's configured timezone — see the `timeZone`
 * option below) so a sweep across every ACTIVE subscription doesn't
 * compete with real user traffic.
 *
 * This class is intentionally thin — it owns *scheduling*, not business
 * logic. The actual expiration rule lives in
 * `SubscriptionsService.expireOverdueSubscriptions()`, which is unit
 * testable and callable on its own (e.g. from an admin "run now" endpoint
 * or a one-off script) without dragging in `@nestjs/schedule` at all.
 */
@Injectable()
export class SubscriptionExpirationScheduler {
  private readonly logger = new Logger(SubscriptionExpirationScheduler.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'subscription-expiration-check',
    timeZone: 'Asia/Yerevan',
  })
  async handleDailyExpirationCheck(): Promise<void> {
    this.logger.log('Starting daily subscription expiration check...');

    try {
      const { checked, expired } = await this.subscriptionsService.expireOverdueSubscriptions();
      this.logger.log(
        `Subscription expiration check complete: ${checked} overdue, ${expired} expired.`,
      );
    } catch (error) {
      // The whole sweep failing (e.g. a DB outage at 02:00) must be loud —
      // this is exactly the kind of silent failure that leaves paying
      // students' access unrevoked and non-paying students' access
      // unnoticed for a day. expireOverdueSubscriptions() already isolates
      // *per-row* failures internally; reaching this catch means something
      // broke before/around the whole batch, not just one row.
      this.logger.error(
        'Daily subscription expiration check failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
