import type { Request } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

/**
 * Browser clients get the refresh token exclusively via an httpOnly,
 * Secure, SameSite cookie (set in AuthController) — it's never exposed to
 * client-side JS. Non-browser API clients (a future mobile app, a
 * server-to-server integration) have no cookie jar in the same sense, so a
 * `refreshToken` field in the JSON body is accepted as a fallback.
 */
export function extractRefreshToken(req: Request): string | null {
  const cookieValue = (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_TOKEN_COOKIE_NAME
  ];
  if (typeof cookieValue === 'string' && cookieValue.length > 0) {
    return cookieValue;
  }

  const bodyValue = (req.body as Record<string, unknown> | undefined)?.refreshToken;
  if (typeof bodyValue === 'string' && bodyValue.length > 0) {
    return bodyValue;
  }

  return null;
}
