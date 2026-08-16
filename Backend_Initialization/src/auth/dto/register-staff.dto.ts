import { UserRole } from '@prisma/client';
import { IsIn } from 'class-validator';

import { RegisterDto } from './register.dto';

/**
 * Used only by the admin-guarded staff-creation endpoint. Public
 * `/auth/register` never accepts a `role` field — every self-service
 * signup is a STUDENT, full stop. Creating a TEACHER or ADMIN account is a
 * privileged action performed *by* an existing admin, which is exactly why
 * this DTO lives behind `@Roles(UserRole.ADMIN)` on its controller method
 * rather than being reachable from the public registration flow.
 */
export class RegisterStaffDto extends RegisterDto {
  @IsIn([UserRole.ADMIN, UserRole.TEACHER], {
    message: 'role must be either ADMIN or TEACHER',
  })
  role!: UserRole;
}
