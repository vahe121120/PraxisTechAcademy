import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import ms from 'ms';

import { AppConfigService } from '../config/app-config.service';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { AuthenticatedRequestUser } from '../types/express';
import { AuthService, RequestMeta } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { REFRESH_TOKEN_COOKIE_NAME } from './utils/extract-refresh-token';

const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser; accessToken: string }> {
    const { user, accessToken, refreshToken } = await this.authService.register(
      dto,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  /** Admin-only: creates a TEACHER or ADMIN account. See RegisterStaffDto for why this is never reachable from public registration. */
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post('register-staff')
  @HttpCode(HttpStatus.CREATED)
  registerStaff(@Body() dto: RegisterStaffDto, @CurrentUser() actor: SafeUser): Promise<SafeUser> {
    return this.authService.registerStaff(dto, actor.id);
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    // LoginDto is intentionally unused as a parameter here — validation
    // still runs (ValidationPipe processes the body before LocalAuthGuard's
    // strategy reads req.body), it's just LocalStrategy, not this handler,
    // that consumes the parsed credentials.
    @Body() _dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser; accessToken: string }> {
    const currentUser = req.user as AuthenticatedRequestUser;
    const { user, accessToken, refreshToken } = await this.authService.login(
      currentUser.id,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser; accessToken: string }> {
    const currentUser = req.user as AuthenticatedRequestUser;
    const { user, accessToken, refreshToken } = await this.authService.rotateRefreshToken(
      currentUser,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    // The access token alone doesn't carry which refresh-token row to
    // revoke, so the refresh cookie (if present) is read directly here —
    // logout must succeed even if the cookie is missing/already expired,
    // which is why this doesn't go through JwtRefreshGuard.
    const rawRefreshToken = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_TOKEN_COOKIE_NAME
    ];
    let refreshTokenId: string | undefined;
    if (rawRefreshToken) {
      const payload = await this.authService.decodeRefreshTokenUnsafe(rawRefreshToken);
      refreshTokenId = payload?.jti;
    }

    await this.authService.logout(refreshTokenId, user.id);
    this.clearRefreshCookie(res);
  }

  /** Beyond the literal spec — see AuthService.logoutAllDevices for why it's included. */
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser() user: SafeUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logoutAllDevices(user.id);
    this.clearRefreshCookie(res);
  }

  @Get('me')
  me(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: SafeUser, @Body() dto: UpdateProfileDto): Promise<SafeUser> {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUser() user: SafeUser, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.authService.changePassword(user.id, dto);
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private requestMeta(req: Request): RequestMeta {
    return {
      userAgent: req.header('user-agent'),
      ipAddress: req.ip,
    };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'strict',
      domain: this.config.cookieDomain,
      path: REFRESH_COOKIE_PATH,
      maxAge: ms(this.config.jwtRefreshExpiresIn as ms.StringValue),
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'strict',
      domain: this.config.cookieDomain,
      path: REFRESH_COOKIE_PATH,
    });
  }
}
