/** The signed-in user as the web sees it. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isDemo: boolean;
  /** ISO time the onboarding was completed or skipped; `null` while it is still due. */
  onboardingCompletedAt: string | null;
}
