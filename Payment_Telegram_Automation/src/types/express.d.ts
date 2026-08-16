import type { SafeUser } from '../users/interfaces/safe-user.interface';

/**
 * Superset of `SafeUser` used specifically for `Express.User`. The two
 * optional fields are populated only by `JwtRefreshStrategy` (never by the
 * regular access-token `JwtStrategy`), so the refresh controller can
 * perform token rotation without a second JWT decode — see
 * `auth.controller.ts`'s `refresh()` handler.
 */
export interface AuthenticatedRequestUser extends SafeUser {
  refreshTokenId?: string;
  refreshFamilyId?: string;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedRequestUser {}
  }
}

export {};
