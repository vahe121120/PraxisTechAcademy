import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { registerDecorator } from 'class-validator';

// Telegram usernames: 5-32 characters, letters/digits/underscores, must
// start with a letter. (A leading "@" is stripped by the DTO's @Transform
// before this runs — see normalizeTelegramUsername.)
const TELEGRAM_USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function IsTelegramUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTelegramUsername',
      target: object.constructor,
      propertyName,
      options: {
        message:
          'telegramUsername must be 5-32 characters, start with a letter, and contain only letters, numbers, and underscores',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && TELEGRAM_USERNAME_PATTERN.test(value);
        },
        defaultMessage(_args: ValidationArguments): string {
          return 'telegramUsername must be 5-32 characters, start with a letter, and contain only letters, numbers, and underscores';
        },
      },
    });
  };
}
