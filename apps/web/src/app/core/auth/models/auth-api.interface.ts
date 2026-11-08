import type { AuthProvider, AuthUser } from '@shelfmark/contracts';

/**
 * What the web app needs from authentication. `BetterAuthApi` is bound in production,
 * `MockAuthApi` in development and e2e (`provide-auth-api.ts`), without touching `AuthStore`
 * or the pages.
 */
export interface AuthApi {
  /** The current session's user, or `null` for a guest. */
  getSession(): Promise<AuthUser | null>;
  /**
   * Signs in with an OAuth provider; rejects when it fails. `returnUrl` is a path inside the app
   * (or `null`) to land on afterwards. Resolves with the user when the session exists already
   * (the mock), or with `null` when the browser is being sent to the provider (the real API).
   */
  signIn(provider: AuthProvider, returnUrl: string | null): Promise<AuthUser | null>;
  /** Creates a demo sandbox session; rejects when it fails. */
  signInDemo(): Promise<AuthUser>;
  /** Ends the session on the server; rejects when the server did not confirm. */
  signOut(): Promise<void>;
}
