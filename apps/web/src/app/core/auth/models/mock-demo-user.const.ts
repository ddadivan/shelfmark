import type { AuthUser } from '@shelfmark/contracts';

/** Who the mock API signs in for the demo; `demoExpiresAt` is set at sign-in (now + the session length). */
export const MOCK_DEMO_USER: Omit<AuthUser, 'demoExpiresAt'> = {
  id: 'mock-demo',
  name: 'Demo user',
  email: 'demo@example.com',
  image: null,
  isDemo: true,
};
