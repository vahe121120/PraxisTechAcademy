import { request } from "@/lib/api/http";

export interface TelegramLinkResult {
  deepLink: string;
  expiresAt: string;
}

// Requests a one-time /start <token> deep link. The bot links the account
// server-side once the student opens the link in Telegram.
export function requestTelegramLink(accessToken: string) {
  return request<TelegramLinkResult>("/telegram/link", { method: "POST", accessToken });
}

export function unlinkTelegram(accessToken: string) {
  return request<void>("/telegram/unlink", { method: "POST", accessToken });
}
