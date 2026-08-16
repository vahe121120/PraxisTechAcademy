import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { normalizeEmail } from '../../common/utils/normalize';

export class LoginDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value: string }) => normalizeEmail(value))
  email!: string;

  // Intentionally NOT re-validated against the strong-password policy here:
  // that policy applies to choosing a new password, not to authenticating
  // with an existing one (which could predate a policy tightening).
  @IsString()
  @MinLength(1, { message: 'password is required' })
  password!: string;
}
