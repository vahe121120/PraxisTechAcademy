import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

import { normalizeEmail, normalizeTelegramUsername } from '../../common/utils/normalize';
import { IsE164Phone } from '../../common/validators/is-e164-phone.validator';
import { IsTelegramUsername } from '../../common/validators/is-telegram-username.validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 150, { message: 'name must be between 2 and 150 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsE164Phone()
  @Transform(({ value }: { value: string }) => value?.trim())
  phone?: string;

  // `null` explicitly clears the field (the student no longer wants a
  // Telegram contact on file); omitting the key entirely leaves it
  // untouched. `@IsOptional()` treats both `undefined` and `null` as
  // "skip further validation," which is exactly this distinction.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Transform(({ value }: { value: string | null }) =>
    typeof value === 'string' ? normalizeTelegramUsername(value) : value,
  )
  @IsTelegramUsername()
  telegramUsername?: string | null;

  // Changing email resets emailVerifiedAt server-side — see UsersService.
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value: string }) => (value ? normalizeEmail(value) : value))
  email?: string;
}
