import type { PROGRESS_BAR_VARIANT } from './progress-bar-variant.const';

/** `fixed`: the 2px bar at the top of the viewport; `inline`: a 3px track inside a box. */
export type ProgressBarVariant = (typeof PROGRESS_BAR_VARIANT)[keyof typeof PROGRESS_BAR_VARIANT];
