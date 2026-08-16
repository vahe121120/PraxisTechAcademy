import { Module } from '@nestjs/common';

import { TELEGRAM_ACCESS_PORT } from './telegram-access.port';
import { TelegramBotApiClient } from './telegram-bot-api.client';
import { TelegramController } from './telegram.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramService } from './telegram.service';

@Module({
  controllers: [TelegramController, TelegramWebhookController],
  providers: [
    TelegramService,
    TelegramBotApiClient,
    // `useExisting` (not `useClass`): reuses the same TelegramService
    // instance rather than instantiating a second one, while still
    // letting consumers depend on the abstract TELEGRAM_ACCESS_PORT token
    // instead of TelegramService directly.
    { provide: TELEGRAM_ACCESS_PORT, useExisting: TelegramService },
  ],
  // Both are exported: TelegramService for anything that needs the full
  // API (this module's own controllers, tests), and the token for
  // SubscriptionsModule/PaymentsModule, which should only ever depend on
  // the abstract port.
  exports: [TelegramService, TELEGRAM_ACCESS_PORT],
})
export class TelegramModule {}
