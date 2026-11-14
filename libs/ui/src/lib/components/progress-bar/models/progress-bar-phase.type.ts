import type { PROGRESS_BAR_PHASE } from './progress-bar-phase.const';

/** `idle`: nothing rendered; `running`: indeterminate; `done`: filled to 100% and fading out. */
export type ProgressBarPhase = (typeof PROGRESS_BAR_PHASE)[keyof typeof PROGRESS_BAR_PHASE];
