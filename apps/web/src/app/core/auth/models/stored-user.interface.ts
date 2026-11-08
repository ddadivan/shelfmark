import type { AuthUser } from '@shelfmark/contracts';

/** A stored mock session; the onboarding and demo fields may be missing in seeds from before they existed. */
export type StoredUser = Omit<AuthUser, 'onboardingCompletedAt' | 'demoExpiresAt'> & {
  onboardingCompletedAt?: string | null;
  demoExpiresAt?: string | null;
};
