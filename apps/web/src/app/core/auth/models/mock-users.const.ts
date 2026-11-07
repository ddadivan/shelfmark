import { AUTH_PROVIDER } from '@shelfmark/contracts';
import type { AuthProvider } from '@shelfmark/contracts';
import type { AuthUser } from '@shelfmark/contracts';

/** Who the mock API signs in for each provider. */
export const MOCK_USERS: Record<AuthProvider, AuthUser> = {
  [AUTH_PROVIDER.Google]: {
    id: 'mock-google',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    image: null,
    isDemo: false,
  },
  [AUTH_PROVIDER.GitHub]: {
    id: 'mock-github',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    image: null,
    isDemo: false,
  },
};
