import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { TelegramApiError } from './errors/telegram-api.error';
import {
  TelegramApiEnvelope,
  TelegramChatInviteLink,
  TelegramMessage,
} from './interfaces/telegram-api.interface';

/**
 * Thin wrapper over https://core.telegram.org/bots/api — one method per Bot
 * API method actually used, each returning the unwrapped `result`. Every
 * higher-level concern (who to message, what a "grant" means, database
 * bookkeeping) lives in `TelegramService`; this class only knows how to
 * talk to Telegram's HTTP API correctly and safely (timeouts, error
 * envelope handling), the same separation `ArcaPaymentProvider` keeps from
 * `PaymentsService`.
 */
@Injectable()
export class TelegramBotApiClient {
  constructor(private readonly config: AppConfigService) {}

  /**
   * A single-use (or capped-use) invite link for a specific chat. Telegram
   * bots cannot create new group chats via the API at all — a human has to
   * create the group and add the bot as an admin first; this only creates
   * a *link* into an already-existing, already-linked chat.
   */
  async createChatInviteLink(
    chatId: bigint,
    options: { memberLimit?: number; expireDate?: Date; name?: string } = {},
  ): Promise<TelegramChatInviteLink> {
    return this.call<TelegramChatInviteLink>('createChatInviteLink', {
      chat_id: chatId.toString(),
      ...(options.memberLimit !== undefined ? { member_limit: options.memberLimit } : {}),
      ...(options.expireDate
        ? { expire_date: Math.floor(options.expireDate.getTime() / 1000) }
        : {}),
      ...(options.name ? { name: options.name.slice(0, 32) } : {}), // Telegram caps invite link names at 32 chars
    });
  }

  async revokeChatInviteLink(chatId: bigint, inviteLink: string): Promise<void> {
    await this.call('revokeChatInviteLink', {
      chat_id: chatId.toString(),
      invite_link: inviteLink,
    });
  }

  /** Sends a direct message to a user — only possible if that user has previously started a conversation with the bot (see the /start deep-link flow in TelegramWebhookController). */
  async sendMessage(
    chatId: bigint,
    text: string,
    options: { parseMode?: 'HTML' | 'MarkdownV2' } = {},
  ): Promise<TelegramMessage> {
    return this.call<TelegramMessage>('sendMessage', {
      chat_id: chatId.toString(),
      text,
      ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
    });
  }

  /**
   * Removes a member from a group by banning then immediately unbanning
   * them — Telegram's documented pattern for "kick without a permanent
   * ban," so the student can rejoin on a future renewal via a fresh
   * invite link rather than being permanently blocked from the chat.
   */
  async kickChatMember(chatId: bigint, userId: bigint): Promise<void> {
    await this.call('banChatMember', { chat_id: chatId.toString(), user_id: userId.toString() });
    await this.call('unbanChatMember', {
      chat_id: chatId.toString(),
      user_id: userId.toString(),
      only_if_banned: true,
    });
  }

  // -------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------

  private async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const url = `${this.config.telegramApiBaseUrl.replace(/\/+$/, '')}/bot${this.config.telegramBotToken}/${method}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.telegramRequestTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const text = await response.text();
      let envelope: TelegramApiEnvelope<T>;
      try {
        envelope = JSON.parse(text) as TelegramApiEnvelope<T>;
      } catch (parseError) {
        throw new TelegramApiError(
          `Telegram response for ${method} was not valid JSON: ${text.slice(0, 500)}`,
          undefined,
          parseError,
        );
      }

      if (!envelope.ok) {
        throw new TelegramApiError(
          `Telegram API rejected ${method}: ${envelope.description ?? 'no description'}`,
          envelope.error_code,
        );
      }

      // The Bot API returns `result: true` (a bare boolean) for several
      // methods with no meaningful payload (e.g. banChatMember) — callers
      // that only care about success/failure discard the return value.
      return envelope.result as T;
    } catch (error) {
      if (error instanceof TelegramApiError) {
        throw error;
      }
      const isAbort = error instanceof Error && error.name === 'AbortError';
      throw new TelegramApiError(
        isAbort
          ? `Telegram request ${method} timed out after ${this.config.telegramRequestTimeoutMs}ms`
          : `Telegram request ${method} failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
