import { AUTH_PROVIDER, type AuthProvider } from '@shelfmark/contracts';

/** The only host each provider's authorize URL may point at (`https` only). */
export const AUTH_PROVIDER_HOST = {
  [AUTH_PROVIDER.Google]: 'accounts.google.com',
  [AUTH_PROVIDER.GitHub]: 'github.com',
} as const satisfies Record<AuthProvider, string>;
