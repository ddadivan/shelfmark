import type { OnboardingResponse } from '@shelfmark/contracts';

/**
 * What the web app needs from the onboarding endpoints. `HttpOnboardingApi` talks to
 * `/api/me/onboarding`; the mock (development and e2e builds) rewrites the stored session.
 */
export interface OnboardingApi {
  /** `POST /api/me/onboarding`: marks the onboarding completed; resolves with the server time. */
  complete(): Promise<OnboardingResponse>;
  /** `DELETE /api/me/onboarding`: makes the welcome tour due again. */
  reset(): Promise<void>;
}
