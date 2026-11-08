import { AuthUser } from './auth-user.interface';

/** Who the mock API signs in for the demo. */
export const MOCK_DEMO_USER: AuthUser = {
  id: 'mock-demo',
  name: 'Demo user',
  email: 'demo@example.com',
  image: null,
  isDemo: true,
  onboardingCompletedAt: null,
};
