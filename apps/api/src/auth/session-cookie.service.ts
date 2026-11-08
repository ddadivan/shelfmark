import type { IncomingHttpHeaders } from 'node:http';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { readAppConfig } from '../config/app-config';
import { AUTH_COOKIE_PREFIX } from './models/auth-cookie-prefix.const';
import { AUTH_SESSION_COOKIE } from './models/auth-session-cookie.const';
import { SIGN_OUT_TIMEOUT_MS } from './models/sign-out-timeout.const';

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

/**
 * Feature modules never import the Better Auth integration (ESLint, ADR 0029): this is the one
 * place that turns a request's session cookie into the `Set-Cookie` headers that expire it.
 */
@Injectable()
export class SessionCookieService {
  constructor(private readonly authService: AuthService) {}

  /**
   * Better Auth's own sign-out for the request's cookie, so the cookie names and attributes
   * (`__Secure-` prefix, Secure, SameSite, Max-Age=0) always match the ones it set. Also removes
   * the current session row when it still exists. Rejects after `SIGN_OUT_TIMEOUT_MS`.
   */
  async clearingCookies(headers: IncomingHttpHeaders): Promise<string[]> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Sign-out timed out')), SIGN_OUT_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([
        this.authService.api.signOut({ headers: fromNodeHeaders(headers), returnHeaders: true }),
        timeout,
      ]);
      return result.headers.getSetCookie();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Hand-built expired session cookie with the attributes `createAuth` pins (shared constants:
   * path, HttpOnly, SameSite, name; Secure + `__Secure-` exactly in production). Fallback when
   * `clearingCookies` fails after the account is already gone.
   */
  fallbackClearingCookies(): string[] {
    const secure = readAppConfig().isProduction;
    const name = `${secure ? AUTH_SESSION_COOKIE.SecurePrefix : ''}${AUTH_COOKIE_PREFIX}.${AUTH_SESSION_COOKIE.Name}`;
    const attributes = [
      `Path=${AUTH_SESSION_COOKIE.Path}`,
      'Max-Age=0',
      ...(AUTH_SESSION_COOKIE.HttpOnly ? ['HttpOnly'] : []),
      `SameSite=${capitalize(AUTH_SESSION_COOKIE.SameSite)}`,
      ...(secure ? ['Secure'] : []),
    ];
    return [`${name}=; ${attributes.join('; ')}`];
  }
}
