import { IsString, IsStrongPassword, MinLength } from 'class-validator';

import { IsDifferentFrom } from '../../common/validators/is-different-from.validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'currentPassword is required' })
  currentPassword!: string;

  @IsStrongPassword(
    { minLength: 12, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
    {
      message:
        'newPassword must be at least 12 characters and include an uppercase letter, a lowercase letter, a number, and a symbol',
    },
  )
  @IsDifferentFrom('currentPassword', {
    message: 'newPassword must be different from currentPassword',
  })
  newPassword!: string;
}
