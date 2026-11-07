import type { IncomingHttpHeaders } from 'node:http';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { readAppConfig } from '../config/app-config';
import { AUTH_COOKIE_PREFIX } from './models/auth-cookie-prefix.const';

const SESSION_COOKIE_NAME = `${AUTH_COOKIE_PREFIX}.session_token`;

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
   * the current session row when it still exists.
   */
  async clearingCookies(headers: IncomingHttpHeaders): Promise<string[]> {
    const result = await this.authService.api.signOut({
      headers: fromNodeHeaders(headers),
      returnHeaders: true,
    });
    return result.headers.getSetCookie();
  }

  /**
   * Hand-built expired session cookie with the attributes `createAuth` pins (path `/`, HttpOnly,
   * SameSite=Lax, Secure + `__Secure-` exactly in production). Fallback when `clearingCookies`
   * fails after the account is already gone.
   */
  fallbackClearingCookies(): string[] {
    const secure = readAppConfig().isProduction;
    const name = `${secure ? '__Secure-' : ''}${SESSION_COOKIE_NAME}`;
    const attributes = [
      'Path=/',
      'Max-Age=0',
      'HttpOnly',
      'SameSite=Lax',
      ...(secure ? ['Secure'] : []),
    ];
    return [`${name}=; ${attributes.join('; ')}`];
  }
}
