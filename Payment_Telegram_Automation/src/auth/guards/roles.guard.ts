import { ExecutionContext, Injectable, CanActivate, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Deliberately NOT a global `APP_GUARD`. Nest guarantees global guards run
 * before controller/method-level ones for a single request, so applying
 * this one via `@UseGuards(RolesGuard)` on specific routes — rather than
 * globally — is what guarantees `request.user` (populated by the global
 * `JwtAuthGuard`) is always already set by the time this guard reads it,
 * with zero ambiguity about provider registration order.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    return true;
  }
}
