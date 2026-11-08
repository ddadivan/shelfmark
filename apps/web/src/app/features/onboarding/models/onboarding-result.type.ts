import { ONBOARDING_RESULT } from './onboarding-result.const';

export type OnboardingResult = (typeof ONBOARDING_RESULT)[keyof typeof ONBOARDING_RESULT];
