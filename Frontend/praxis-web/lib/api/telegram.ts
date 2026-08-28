import { request } from "@/lib/api/http";

export interface TelegramLinkResult {
  deepLink: string;
  expiresAt: string;
}

// Requests a one-time /start <token> deep link. The bot links the account
// server-side once the student opens the link in Telegram. Route is
// /telegram/link/request, not /telegram/link.
export function requestTelegramLink(accessToken: string) {
  return request<TelegramLinkResult>("/telegram/link/request", {
    method: "POST",
    accessToken,
  });
}

export interface TelegramLinkStatus {
  linked: boolean;
}

// SafeUser carries no `telegramLinked` field — whether the current user is
// linked has to be checked via this endpoint instead.
export function getTelegramLinkStatus(accessToken: string) {
  return request<TelegramLinkStatus>("/telegram/link/status", { accessToken });
}

// Note: there is no unlink endpoint on the backend today (TelegramController
// only exposes link/request, link/status, and the admin link-group route).
// A previous version of this client called a non-existent POST
// /telegram/unlink, which always 404'd — removed rather than left pointing
// at a route that doesn't exist. Add this back once/if the backend grows
// a corresponding endpoint.

export interface LinkTelegramGroupPayload {
  courseGroupId: string;
  /** Telegram chat id as a string (large negative integers for supergroups). */
  telegramChatId: string;
  title: string;
}

export function linkTelegramGroup(payload: LinkTelegramGroupPayload, accessToken: string) {
  return request<{ id: string }>("/telegram/admin/link-group", {
    method: "POST",
    body: payload,
    accessToken,
  });
}
