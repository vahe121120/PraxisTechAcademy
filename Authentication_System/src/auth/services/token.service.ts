import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import ms from 'ms';

import { AppConfigService } from '../../config/app-config.service';
import { AccessTokenPayload, RefreshTokenPayload } from '../interfaces/token-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessExpiresIn as ms.StringValue,
    });
  }

  signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiresIn as ms.StringValue,
    });
  }

  /** Verifies signature and expiry; throws if either check fails. */
  verifyRefreshToken(rawToken: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(rawToken, {
      secret: this.config.jwtRefreshSecret,
    });
  }

  /**
   * Verifies signature only, tolerating an expired token — used solely by
   * logout to recover which RefreshToken row to mark revoked even if the
   * cookie has already expired. Still requires a valid signature, so a
   * client can't get an arbitrary session revoked by fabricating a jti.
   */
  async verifyRefreshTokenIgnoringExpiry(rawToken: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(rawToken, {
        secret: this.config.jwtRefreshSecret,
        ignoreExpiration: true,
      });
    } catch {
      return null;
    }
  }

  /**
   * Refresh tokens are high-entropy, machine-generated secrets — the
   * opposite of a human password — so hashing them with bcrypt (deliberately
   * slow, designed to resist brute-forcing a *low*-entropy secret) buys
   * nothing but latency. SHA-256 is the right tool: fast, deterministic
   * (so it can be looked up by equality), and cryptographically strong
   * against a token with this much entropy behind it.
   */
  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /** Constant-time comparison — a timing side-channel on token comparison is a real, if narrow, attack surface worth closing for free. */
  compareTokenHash(rawToken: string, storedHash: string): boolean {
    const computed = Buffer.from(this.hashToken(rawToken), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    if (computed.length !== stored.length) {
      return false;
    }
    return timingSafeEqual(computed, stored);
  }

  generateFamilyId(): string {
    return randomUUID();
  }

  refreshExpiryDate(): Date {
    return new Date(Date.now() + ms(this.config.jwtRefreshExpiresIn as ms.StringValue));
  }
}
