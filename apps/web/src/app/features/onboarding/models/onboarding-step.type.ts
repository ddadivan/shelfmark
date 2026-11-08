import { ONBOARDING_STEP } from './onboarding-step.const';

export type OnboardingStep = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];
