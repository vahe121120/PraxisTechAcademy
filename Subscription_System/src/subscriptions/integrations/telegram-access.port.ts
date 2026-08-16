export interface RevokeAccessInput {
  userId: string;
  courseGroupId: string;
  subscriptionId: string;
  reason: 'EXPIRED' | 'CANCELLED';
}

export interface GrantAccessInput {
  userId: string;
  courseGroupId: string;
  subscriptionId: string;
}

/**
 * The boundary between subscription billing state and actual Telegram
 * group membership. `SubscriptionsService` depends only on this interface
 * — never on the Telegram Bot API directly — via the `TELEGRAM_ACCESS_PORT`
 * injection token (see below), exactly the same DI-token pattern used for
 * `PaymentProvider`.
 *
 * No `TelegramModule` exists in this codebase yet (it's the bot-driven
 * invite-link/kick-and-unban flow described in the original architecture
 * doc). Until it does, `NoopTelegramAccessPort` is bound to this token: it
 * logs what *would* have happened and writes the fact to
 * `NotificationLog`/`AuditLog` so nothing is silently lost. Swapping in the
 * real implementation later is a one-line change in `SubscriptionsModule`
 * — nothing in `SubscriptionsService` needs to change at all.
 */
export interface TelegramAccessPort {
  revokeAccess(input: RevokeAccessInput): Promise<void>;
  grantAccess(input: GrantAccessInput): Promise<void>;
}

export const TELEGRAM_ACCESS_PORT = Symbol('TELEGRAM_ACCESS_PORT');
