import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SafeUser, toSafeUser } from '../users/interfaces/safe-user.interface';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthenticatedRequestUser } from '../types/express';
import { RefreshTokenPayload } from './interfaces/token-payload.interface';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  // ---------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------

  /** Public self-service signup. Always STUDENT — see RegisterStaffDto for why ADMIN/TEACHER creation is a separate, guarded path. */
  async register(dto: RegisterDto, meta: RequestMeta): Promise<{ user: SafeUser } & TokenPair> {
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.usersService.createStudent({
      email: dto.email,
      passwordHash,
      name: dto.name,
      phone: dto.phone,
      telegramUsername: dto.telegramUsername,
    });

    await this.writeAudit(user.id, 'USER_REGISTERED', 'User', user.id, null, {
      email: user.email,
      role: user.role,
    });

    const tokens = await this.issueTokenPair(user, meta);
    return { user: toSafeUser(user), ...tokens };
  }

  /** Admin-only. Creates a TEACHER or ADMIN account without logging the creator in as that account. */
  async registerStaff(dto: RegisterStaffDto, actorUserId: string): Promise<SafeUser> {
    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone ?? null,
        telegramUsername: dto.telegramUsername ?? null,
        role: dto.role,
      },
    });

    await this.writeAudit(actorUserId, 'STAFF_ACCOUNT_CREATED', 'User', user.id, null, {
      email: user.email,
      role: user.role,
    });

    return toSafeUser(user);
  }

  // ---------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------

  /**
   * Used by LocalStrategy. Deliberately returns the same generic error for
   * "no such account" and "wrong password" — telling an attacker which one
   * failed is a free account-enumeration oracle.
   */
  async validateCredentials(email: string, plainPassword: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Run bcrypt.compare against a dummy hash even when no user exists,
      // so a login attempt against a non-existent email takes roughly the
      // same time as one against a real email with a wrong password —
      // otherwise the response-time difference itself leaks which emails
      // are registered.
      await this.passwordService.compare(plainPassword, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!this.usersService.isActive(user)) {
      throw new UnauthorizedException('This account is suspended. Contact support for help.');
    }

    const passwordMatches = await this.passwordService.compare(plainPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  async login(userId: string, meta: RequestMeta): Promise<{ user: SafeUser } & TokenPair> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    const tokens = await this.issueTokenPair(user, meta);
    await this.writeAudit(user.id, 'USER_LOGGED_IN', 'User', user.id, null, {
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
    return { user: toSafeUser(user), ...tokens };
  }

  // ---------------------------------------------------------------------
  // Refresh token validation + rotation
  // ---------------------------------------------------------------------

  /**
   * Called from JwtRefreshStrategy after passport-jwt has already verified
   * the token's signature and expiry claim. This layer checks the one
   * thing a stateless JWT can never prove on its own: whether this
   * specific token has already been revoked or rotated away — which is
   * exactly what lets a stolen-but-already-used refresh token be detected
   * and its whole session family shut down.
   */
  async assertRefreshTokenValid(
    payload: RefreshTokenPayload,
    rawToken: string,
  ): Promise<AuthenticatedRequestUser> {
    const tokenRow = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });

    if (!tokenRow) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (tokenRow.revokedAt) {
      // This exact token was already rotated away (or explicitly revoked
      // via logout) and is being presented again — the two legitimate
      // explanations are a client double-submitting a stale token or
      // outright theft. Either way, the safe response is the same: kill
      // every token in the family and force a fresh login.
      await this.revokeFamily(tokenRow.familyId);
      this.logger.warn(
        `Refresh token reuse detected for user ${tokenRow.userId}, family ${tokenRow.familyId} — family revoked.`,
      );
      await this.writeAudit(
        tokenRow.userId,
        'REFRESH_TOKEN_REUSE_DETECTED',
        'RefreshToken',
        tokenRow.id,
        null,
        { familyId: tokenRow.familyId },
      );
      throw new UnauthorizedException('Refresh token has already been used. Please log in again.');
    }

    if (tokenRow.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    if (!this.tokenService.compareTokenHash(rawToken, tokenRow.tokenHash)) {
      // Valid signature and a matching, non-revoked row id, but the token
      // body itself doesn't hash to what's stored — should be
      // cryptographically impossible without the signing secret, kept as
      // a defense-in-depth check rather than trusted alone.
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.usersService.findById(tokenRow.userId);
    if (!user || !this.usersService.isActive(user)) {
      throw new UnauthorizedException('Account is no longer active.');
    }

    return {
      ...toSafeUser(user),
      refreshTokenId: tokenRow.id,
      refreshFamilyId: tokenRow.familyId,
    };
  }

  /** Rotates the presented refresh token: revokes it and issues a fresh pair sharing the same family. */
  async rotateRefreshToken(
    currentUser: AuthenticatedRequestUser,
    meta: RequestMeta,
  ): Promise<{ user: SafeUser } & TokenPair> {
    if (!currentUser.refreshTokenId || !currentUser.refreshFamilyId) {
      // Should be unreachable — assertRefreshTokenValid always sets both —
      // but fail closed rather than silently minting an orphaned family.
      throw new UnauthorizedException('Invalid refresh token context.');
    }

    await this.prisma.refreshToken.update({
      where: { id: currentUser.refreshTokenId },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(currentUser.id);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    const tokens = await this.issueTokenPair(user, meta, currentUser.refreshFamilyId);
    return { user: toSafeUser(user), ...tokens };
  }

  /**
   * Best-effort extraction of a refresh token's id for logout purposes —
   * tolerates an already-expired token (a client logging out with a stale
   * cookie should still succeed) but still requires a valid signature.
   */
  async decodeRefreshTokenUnsafe(rawToken: string): Promise<RefreshTokenPayload | null> {
    return this.tokenService.verifyRefreshTokenIgnoringExpiry(rawToken);
  }

  // ---------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------

  async logout(refreshTokenId: string | undefined, userId: string): Promise<void> {
    if (refreshTokenId) {
      await this.prisma.refreshToken.updateMany({
        where: { id: refreshTokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.writeAudit(userId, 'USER_LOGGED_OUT', 'User', userId, null, null);
  }

  /** Beyond the literal "logout" requirement, but cheap given the family/revocation infrastructure already in place, and expected UX for "log out everywhere." */
  async logoutAllDevices(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.writeAudit(userId, 'USER_LOGGED_OUT_ALL_DEVICES', 'User', userId, null, null);
  }

  // ---------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided to update the profile.');
    }

    const before = await this.usersService.findById(userId);
    const updated = await this.usersService.updateProfile(userId, dto);

    await this.writeAudit(
      userId,
      'PROFILE_UPDATED',
      'User',
      userId,
      before ? { name: before.name, phone: before.phone, email: before.email } : null,
      { name: updated.name, phone: updated.phone, email: updated.email },
    );

    return toSafeUser(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    const currentMatches = await this.passwordService.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const newHash = await this.passwordService.hash(dto.newPassword);
    await this.usersService.updatePasswordHash(userId, newHash);

    // A password change is a strong enough signal that every other active
    // session should be re-authenticated — otherwise "someone got hold of
    // my password" and "I changed my password" leave old sessions alive on
    // whatever device the attacker was using.
    await this.logoutAllDevices(userId);

    await this.writeAudit(userId, 'PASSWORD_CHANGED', 'User', userId, null, null);
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async issueTokenPair(
    user: User,
    meta: RequestMeta,
    existingFamilyId?: string,
  ): Promise<TokenPair> {
    const tokenId = randomUUID();
    const familyId = existingFamilyId ?? randomUUID();

    const refreshToken = await this.tokenService.signRefreshToken({
      sub: user.id,
      jti: tokenId,
      familyId,
    });
    const tokenHash = this.tokenService.hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        familyId,
        tokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: this.tokenService.refreshExpiryDate(),
      },
    });

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
    });

    return { accessToken, refreshToken };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async writeAudit(
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId,
          action,
          entityType,
          entityId,
          before: (before ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
          after: (after ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Auditing must never be allowed to fail the request it's describing
      // — log the failure and move on rather than throwing.
      this.logger.error(
        'Failed to write audit log entry',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

// A syntactically valid bcrypt hash that matches no real password, used
// purely to burn a comparable amount of CPU time on a login attempt
// against a non-existent email — see validateCredentials().
const DUMMY_BCRYPT_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8kW2xIiC3H8/YB2c9v0S4y0V6z6a1u';
