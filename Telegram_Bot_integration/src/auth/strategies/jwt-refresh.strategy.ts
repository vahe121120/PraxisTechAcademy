import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

import { AppConfigService } from '../../config/app-config.service';
import { AuthenticatedRequestUser } from '../../types/express';
import { AuthService } from '../auth.service';
import { RefreshTokenPayload } from '../interfaces/token-payload.interface';
import { extractRefreshToken } from '../utils/extract-refresh-token';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: AppConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: (req: Request) => extractRefreshToken(req),
      ignoreExpiration: false,
      secretOrKey: config.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload): Promise<AuthenticatedRequestUser> {
    const rawToken = extractRefreshToken(req);
    if (!rawToken) {
      // Unreachable in practice — passport-jwt wouldn't have called
      // validate() without extracting a token in the first place — but
      // typed as nullable, so handled explicitly rather than asserted away.
      throw new Error('Refresh token missing from request during validation.');
    }

    return this.authService.assertRefreshTokenValid(payload, rawToken);
  }
}
