import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { registerDecorator } from 'class-validator';

/** Validates that this date-string property is on or after another date-string property on the same DTO. Skips validation if either value is absent — combine with `@IsOptional()`/`@IsDateString()` on both fields for full coverage. */
export function IsOnOrAfter(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOnOrAfter',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be on or after ${property}`,
        ...validationOptions,
      },
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null) {
            return true;
          }
          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];
          if (relatedValue === undefined || relatedValue === null) {
            return true;
          }
          const current = new Date(value as string);
          const related = new Date(relatedValue as string);
          if (Number.isNaN(current.getTime()) || Number.isNaN(related.getTime())) {
            return true; // format validity is IsDateString's job, not this one's
          }
          return current.getTime() >= related.getTime();
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} must be on or after ${relatedPropertyName}`;
        },
      },
    });
  };
}
