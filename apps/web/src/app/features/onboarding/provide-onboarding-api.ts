import type { Provider } from '@angular/core';
import { HttpOnboardingApi } from './http/http-onboarding.api';
import { ONBOARDING_API } from './models/onboarding-api.const';

/**
 * Production binding of `ONBOARDING_API`. The `development` and `e2e` builds replace this file
 * with `mock/provide-onboarding-api.e2e.ts` (`fileReplacements` in `project.json`), so the mock
 * never reaches a production bundle.
 */
export function provideOnboardingApi(): Provider {
  return { provide: ONBOARDING_API, useExisting: HttpOnboardingApi };
}
