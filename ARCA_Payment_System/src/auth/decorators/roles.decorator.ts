import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restricts a route to the listed roles. Must be paired with `RolesGuard` — see its docstring for why it's applied at the route level rather than globally. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
