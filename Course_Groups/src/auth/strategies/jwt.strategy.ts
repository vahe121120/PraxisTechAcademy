import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../../config/app-config.service';
import { SafeUser, toSafeUser } from '../../users/interfaces/safe-user.interface';
import { UsersService } from '../../users/users.service';
import { AccessTokenPayload } from '../interfaces/token-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    });
  }

  /**
   * Passport-jwt has already verified the token's signature and expiry by
   * the time this runs. What's left is exactly the check a short-lived
   * token can't do on its own: confirming the account is still real and
   * still ACTIVE. Without this, a suspended/deleted user's already-issued
   * access token would keep working for up to its full lifetime (default
   * 15 minutes) — acceptable for a forum, not for a payment system.
   */
  async validate(payload: AccessTokenPayload): Promise<SafeUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !this.usersService.isActive(user)) {
      throw new UnauthorizedException('Account is no longer active.');
    }

    return toSafeUser(user);
  }
}
