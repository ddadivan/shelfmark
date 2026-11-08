import { registerDecorator, type ValidationOptions } from 'class-validator';
import { hasControlChars } from './has-control-chars';

/**
 * Rejects strings with control characters (NUL included). Non-strings pass: `@IsString` reports
 * those. `allowTextWhitespace` keeps tab, LF and CR legal (notes). Works with `{ each: true }`.
 */
export function NoControlChars(
  allowTextWhitespace = false,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'noControlChars',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: '$property must not contain control characters', ...options },
      validator: {
        validate: (value: unknown) =>
          typeof value !== 'string' || !hasControlChars(value, allowTextWhitespace),
      },
    });
  };
}
