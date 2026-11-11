import type { FEEDBACK_LOAD_STATE } from './feedback-load-state.const';

export type FeedbackLoadState = (typeof FEEDBACK_LOAD_STATE)[keyof typeof FEEDBACK_LOAD_STATE];
