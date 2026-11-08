import type { RATING_STEP } from './rating-step.const';

export type RatingStep = (typeof RATING_STEP)[keyof typeof RATING_STEP];
