import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { registerDecorator } from 'class-validator';
import { isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validates a real, dialable E.164 phone number (e.g. `+37455123456`),
 * rather than a hand-rolled regex that would accept syntactically
 * plausible but non-existent numbers. Deliberately requires the leading
 * `+` and full country code rather than assuming Armenia as a default —
 * the diaspora audience means students register from many countries.
 */
export function IsE164Phone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isE164Phone',
      target: object.constructor,
      propertyName,
      options: {
        message: 'phone must be a valid phone number in international format, e.g. +37455123456',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidPhoneNumber(value);
        },
        defaultMessage(_args: ValidationArguments): string {
          return 'phone must be a valid phone number in international format, e.g. +37455123456';
        },
      },
    });
  };
}
