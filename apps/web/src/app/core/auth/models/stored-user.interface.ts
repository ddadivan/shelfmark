import type { AuthUser } from './auth-user.interface';

/** A stored mock session; the onboarding flag may be missing in seeds from before it existed. */
export type StoredUser = Omit<AuthUser, 'onboardingCompletedAt'> & {
  onboardingCompletedAt?: string | null;
};
