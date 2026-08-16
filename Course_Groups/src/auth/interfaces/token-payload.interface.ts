import type { UserRole } from '@prisma/client';

/** Kept minimal deliberately — the access token is attached to every request, so it shouldn't carry more than what guards need to make a decision. Anything else is looked up fresh from the DB in JwtStrategy.validate(). */
export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
}

/** `jti` is the RefreshToken row's own id — the lookup key used to validate/revoke this specific token. `familyId` links every token produced by rotating one login session, so reuse of an already-rotated token revokes the whole family at once. */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  familyId: string;
}
