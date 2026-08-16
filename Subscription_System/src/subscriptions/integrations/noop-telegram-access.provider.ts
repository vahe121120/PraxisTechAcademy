import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus, NotificationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { GrantAccessInput, RevokeAccessInput, TelegramAccessPort } from './telegram-access.port';

/**
 * Placeholder binding for `TELEGRAM_ACCESS_PORT`. Does not call the
 * Telegram Bot API (there's nothing to call yet) — instead it records the
 * access change as a `NotificationLog` row (`status: PENDING`) so a future
 * `TelegramModule` (or an operator, in the meantime) has a durable,
 * queryable record of every access grant/revoke that *should* have
 * happened, rather than this being a silent no-op.
 */
@Injectable()
export class NoopTelegramAccessProvider implements TelegramAccessPort {
  private readonly logger = new Logger(NoopTelegramAccessProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async revokeAccess(input: RevokeAccessInput): Promise<void> {
    this.logger.warn(
      `[TelegramModule not yet implemented] Would revoke Telegram access — ` +
        `user=${input.userId} courseGroup=${input.courseGroupId} subscription=${input.subscriptionId} reason=${input.reason}`,
    );

    await this.prisma.notificationLog.create({
      data: {
        userId: input.userId,
        channel: NotificationChannel.TELEGRAM_GROUP,
        type: NotificationType.ACCESS_REVOKED,
        status: NotificationStatus.PENDING,
        metadata: {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          reason: input.reason,
          note: 'Recorded by NoopTelegramAccessProvider — TelegramModule not yet implemented, no actual Telegram action was taken.',
        },
      },
    });
  }

  async grantAccess(input: GrantAccessInput): Promise<void> {
    this.logger.warn(
      `[TelegramModule not yet implemented] Would grant Telegram access — ` +
        `user=${input.userId} courseGroup=${input.courseGroupId} subscription=${input.subscriptionId}`,
    );

    await this.prisma.notificationLog.create({
      data: {
        userId: input.userId,
        channel: NotificationChannel.TELEGRAM_GROUP,
        type: NotificationType.ACCESS_GRANTED,
        status: NotificationStatus.PENDING,
        metadata: {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          note: 'Recorded by NoopTelegramAccessProvider — TelegramModule not yet implemented, no actual Telegram action was taken.',
        },
      },
    });
  }
}
