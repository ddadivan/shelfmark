import { AuthProvider } from './auth-provider.type';
import { AuthUser } from './auth-user.interface';

/**
 * What the web app needs from authentication. `MockAuthApi` implements it today; the Better Auth
 * client replaces it behind the `AUTH_API` token (#64), without touching `AuthStore` or the pages.
 */
export interface AuthApi {
  /** The current session's user, or `null` for a guest. */
  getSession(): Promise<AuthUser | null>;
  /** Signs in with an OAuth provider; rejects when it fails. */
  signIn(provider: AuthProvider): Promise<AuthUser>;
  /** Creates a demo sandbox session; rejects when it fails. */
  signInDemo(): Promise<AuthUser>;
  signOut(): Promise<void>;
}
