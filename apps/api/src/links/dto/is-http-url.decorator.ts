import { isHttpUrl, LINK_LIMIT } from '@shelfmark/contracts';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { hasControlChars } from '../../common/validation/has-control-chars';

/**
 * An absolute http(s) URL without credentials or control characters, at most `LINK_LIMIT.UrlMax`
 * characters. Control characters are checked on the raw text: `new URL` silently drops tabs and
 * line breaks, so the stored text would differ from what was validated.
 */
export function isStorableUrl(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length > LINK_LIMIT.UrlMax ||
    hasControlChars(value) ||
    !isHttpUrl(value)
  ) {
    return false;
  }
  const url = new URL(value);
  return url.username === '' && url.password === '';
}

/**
 * Rejects `javascript:`, `data:`, `vbscript:` and every other non-http(s) scheme, URLs with
 * embedded credentials and over-long URLs (PROJECT.md 5.8, XSS and input validation).
 */
export function IsHttpUrl(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isHttpUrl',
      target: target.constructor,
      propertyName: String(propertyName),
      options: {
        message: `$property must be an http(s) URL without credentials, at most ${LINK_LIMIT.UrlMax} characters`,
        ...options,
      },
      validator: { validate: isStorableUrl },
    });
  };
}
