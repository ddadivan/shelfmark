import { isStorableUrl, LINK_LIMIT } from '@shelfmark/contracts';
import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * Rejects `javascript:`, `data:`, `vbscript:` and every other non-http(s) scheme, URLs with
 * embedded credentials and over-long URLs (PROJECT.md 5.8, XSS and input validation). The rule
 * itself is `isStorableUrl` in the shared contracts, so the web app and the extension check the
 * same thing before they send.
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
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isStorableUrl(value),
      },
    });
  };
}
