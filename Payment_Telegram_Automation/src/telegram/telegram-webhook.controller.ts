import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

import { Public } from '../auth/decorators/public.decorator';
import { AppConfigService } from '../config/app-config.service';
import { TelegramUpdate } from './interfaces/telegram-api.interface';
import { TelegramService } from './telegram.service';

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/**
 * Server-to-server callback from Telegram — never a JWT (Telegram isn't a
 * logged-in user), authenticated instead via the secret token Telegram
 * echoes back on every request once configured via `setWebhook`'s
 * `secret_token` parameter. Always responds 200 once the payload is
 * structurally acceptable, even when a specific update type isn't handled
 * or an internal step fails — a non-2xx response makes Telegram retry
 * (and eventually back off) the same update, which isn't the right
 * response to "we don't recognize this update type" or a transient
 * internal error already logged for investigation.
 */
@Controller({ path: 'telegram', version: '1' })
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request, @Body() update: TelegramUpdate): Promise<{ ok: true }> {
    if (!this.isAuthentic(req.header(SECRET_HEADER))) {
      this.logger.warn('Rejected Telegram webhook call with missing/incorrect secret token.');
      // Still 200: an attacker probing this endpoint learns nothing by a
      // rejection looking different from a no-op accepted update.
      return { ok: true };
    }

    try {
      await this.processUpdate(update);
    } catch (error) {
      this.logger.error(
        `Failed to process Telegram update ${update.update_id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return { ok: true };
  }

  private async processUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (message?.text?.startsWith('/start') && message.from && !message.from.is_bot) {
      const token = message.text.split(' ')[1]?.trim();
      if (!token) {
        return; // bare "/start" with no token — nothing to link, nothing to do
      }

      await this.telegramService.handleStartCommand({
        telegramUserId: BigInt(message.from.id),
        telegramUsername: message.from.username,
        token,
      });
      return;
    }

    if (update.my_chat_member) {
      // Logged for admin visibility only — this is what makes a newly
      // bot-added group's chat id discoverable so an admin can link it via
      // POST /telegram/admin/link-group. No automatic action is taken;
      // linking is a deliberate admin decision, not something that should
      // happen just because the bot was added to some chat.
      const { chat, new_chat_member: newMember } = update.my_chat_member;
      this.logger.log(
        `Bot membership changed in chat ${chat.id} ("${chat.title ?? 'untitled'}"): status=${newMember.status}`,
      );
    }
  }

  private isAuthentic(providedSecret: string | undefined): boolean {
    const expected = this.config.telegramWebhookSecret;
    if (!providedSecret) {
      return false;
    }
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(providedSecret);
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, providedBuf);
  }
}
