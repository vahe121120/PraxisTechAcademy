import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { SafeUser } from '../../users/interfaces/safe-user.interface';

/**
 * Extracts the authenticated user from the request. Only valid on routes
 * protected by `JwtAuthGuard` (i.e. anything not marked `@Public()`) — the
 * value is populated by `JwtStrategy.validate()`, which Passport attaches
 * to `req.user` after a successful token verification.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as SafeUser;
  },
);
