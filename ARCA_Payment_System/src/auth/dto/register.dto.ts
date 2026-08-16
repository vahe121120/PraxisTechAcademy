import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsStrongPassword, Length } from 'class-validator';

import { normalizeEmail, normalizeTelegramUsername } from '../../common/utils/normalize';
import { IsE164Phone } from '../../common/validators/is-e164-phone.validator';
import { IsTelegramUsername } from '../../common/validators/is-telegram-username.validator';

export class RegisterDto {
  @IsString()
  @Length(2, 150, { message: 'name must be between 2 and 150 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value: string }) => normalizeEmail(value))
  email!: string;

  @IsE164Phone()
  @Transform(({ value }: { value: string }) => value?.trim())
  phone!: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? normalizeTelegramUsername(value) : value,
  )
  @IsTelegramUsername()
  telegramUsername?: string;

  // Deliberately strict: this is a payment-bearing account, not a forum
  // signup. 12+ characters with a mix of character classes meaningfully
  // raises the cost of an offline brute-force attempt against a leaked
  // hash, at a UX cost that's reasonable for a paid product.
  @IsStrongPassword(
    { minLength: 12, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    {
      message:
        'password must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol',
    },
  )
  password!: string;
}
