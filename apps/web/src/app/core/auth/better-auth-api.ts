import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AUTH_ENDPOINT,
  type AuthProvider,
  type AuthUser,
  type GetSessionResponse,
  type SignOutResponse,
  type SocialSignInRequest,
  type SocialSignInResponse,
} from '@shelfmark/contracts';
import { AuthApi } from './models/auth-api.interface';
import { AUTH_ROUTE } from './models/auth-routes.const';
import { SIGN_IN_QUERY } from './models/sign-in-query.const';
import { NAVIGATE } from './navigate.token';
import { providerRedirectUrl } from './provider-redirect-url';
import { safeReturnUrl } from './safe-return-url';

/**
 * Production `AuthApi`: the Better Auth routes of the API (ADR 0030) over `HttpClient`, so the
 * session cookie and the CSRF origin check work through the normal interceptor chain.
 */
@Service()
export class BetterAuthApi implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly navigate = inject(NAVIGATE);

  async getSession(): Promise<AuthUser | null> {
    const body = await firstValueFrom(this.http.get<GetSessionResponse>(AUTH_ENDPOINT.GetSession));
    return body?.user ?? null;
  }

  /**
   * Starts the OAuth flow and leaves the page, so it resolves with `null` (no user yet). Both
   * callback URLs are on this origin; the provider URL is checked before the browser follows it.
   */
  async signIn(provider: AuthProvider, returnUrl: string | null): Promise<AuthUser | null> {
    const origin = globalThis.location.origin;
    const target = safeReturnUrl(returnUrl) ?? AUTH_ROUTE.Home;
    const errorUrl = new URL(AUTH_ROUTE.SignIn, origin);
    if (target !== AUTH_ROUTE.Home) {
      errorUrl.searchParams.set(SIGN_IN_QUERY.ReturnUrl, target);
    }
    const request: SocialSignInRequest = {
      provider,
      callbackURL: new URL(target, origin).href,
      errorCallbackURL: errorUrl.href,
    };
    const response = await firstValueFrom(
      this.http.post<SocialSignInResponse>(AUTH_ENDPOINT.SignInSocial, request),
    );
    const url = providerRedirectUrl(response?.url, provider, origin);
    if (url === null) {
      throw new Error('The sign-in response did not contain a trusted URL');
    }
    this.navigate(url);
    return null;
  }

  signInDemo(): Promise<AuthUser> {
    // Demo sign-in has no endpoint yet (#67).
    return Promise.reject(new Error('Demo sign-in is not available yet'));
  }

  async signOut(): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<SignOutResponse>(AUTH_ENDPOINT.SignOut, {}),
    );
    if (response?.success !== true) {
      throw new Error('Sign-out was not confirmed');
    }
  }
}
