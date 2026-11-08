import type { OnboardingStepContent } from './onboarding-step-content.interface';
import { ONBOARDING_STEP } from './onboarding-step.const';

export const ONBOARDING_STEPS: readonly OnboardingStepContent[] = [
  {
    step: ONBOARDING_STEP.Collect,
    illustration: 'welcome-collect',
    titleKey: 'onboarding.collect.title',
    textKey: 'onboarding.collect.text',
  },
  {
    step: ONBOARDING_STEP.Save,
    illustration: 'welcome-save',
    titleKey: 'onboarding.save.title',
    textKey: 'onboarding.save.text',
  },
  {
    step: ONBOARDING_STEP.Find,
    illustration: 'welcome-find',
    titleKey: 'onboarding.find.title',
    textKey: 'onboarding.find.text',
  },
];
