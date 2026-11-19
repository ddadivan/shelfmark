import type { NEW_VIEW_STEP } from './new-view-step.const';

/** One of `NEW_VIEW_STEP`. */
export type NewViewStep = (typeof NEW_VIEW_STEP)[keyof typeof NEW_VIEW_STEP];
