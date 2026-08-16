import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. The global `JwtAuthGuard`
 * (registered as an `APP_GUARD`, see AuthModule) checks for this metadata
 * and short-circuits to "allow" when present. Deliberately opt-in/explicit:
 * every route is locked down by default, and a route becomes public only by
 * a visible, greppable decorator — never by omission.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
