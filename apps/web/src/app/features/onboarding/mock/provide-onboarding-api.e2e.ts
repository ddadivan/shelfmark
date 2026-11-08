import type { Provider } from '@angular/core';
import { ONBOARDING_API } from '../models/onboarding-api.const';
import { MockOnboardingApi } from './mock-onboarding.api';

/** Replaces `provide-onboarding-api.ts` in the `development` and `e2e` builds (`fileReplacements`). */
export function provideOnboardingApi(): Provider {
  return { provide: ONBOARDING_API, useExisting: MockOnboardingApi };
}
