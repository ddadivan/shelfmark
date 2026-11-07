import type { IncomingHttpHeaders } from 'node:http';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';

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
}
