import { InjectionToken } from '@angular/core';
import type { OnboardingApi } from './onboarding-api.interface';

/** No default: `provideOnboardingApi()` registers the implementation, specs provide their own. */
export const ONBOARDING_API = new InjectionToken<OnboardingApi>('ONBOARDING_API');
