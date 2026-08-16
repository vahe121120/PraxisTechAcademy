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
 * The boundary between subscription/payment billing state and actual
 * Telegram group membership. `SubscriptionsService` and `PaymentsService`
 * depend only on this interface — never on `TelegramService` or the
 * Telegram Bot API directly — via the `TELEGRAM_ACCESS_PORT` injection
 * token, the same DI-token pattern used for `PaymentProvider`.
 *
 * Implemented by `TelegramService` in this module (see `telegram.module.ts`
 * for the binding). Both consuming modules only need to `imports:
 * [TelegramModule]` and inject `@Inject(TELEGRAM_ACCESS_PORT)` — nothing
 * about their own logic depends on how Telegram access actually works.
 */
export interface TelegramAccessPort {
  grantAccess(input: GrantAccessInput): Promise<void>;
  revokeAccess(input: RevokeAccessInput): Promise<void>;
}

export const TELEGRAM_ACCESS_PORT = Symbol('TELEGRAM_ACCESS_PORT');
