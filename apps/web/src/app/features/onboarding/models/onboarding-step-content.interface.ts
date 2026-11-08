import type { IllustrationName } from '@shelfmark/ui';
import type { OnboardingStep } from './onboarding-step.type';

/** One step of the welcome tour: its scene and the translation keys of its text. */
export interface OnboardingStepContent {
  readonly step: OnboardingStep;
  readonly illustration: IllustrationName;
  readonly titleKey: string;
  readonly textKey: string;
}
