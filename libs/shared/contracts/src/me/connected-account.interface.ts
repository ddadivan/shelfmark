import type { AuthProvider } from '../auth/auth-provider.type';

/**
 * A sign-in provider linked to the account (Better Auth account record). Only the provider and
 * when it was linked: never tokens, scopes or the provider's account id.
 */
export interface ConnectedAccount {
  provider: AuthProvider;
  /** ISO time the provider was linked. */
  connectedAt: string;
}
