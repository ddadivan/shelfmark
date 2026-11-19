import type { ASK_ACTIVITY } from './ask-activity.const';

/** One of `ASK_ACTIVITY`. */
export type AskActivity = (typeof ASK_ACTIVITY)[keyof typeof ASK_ACTIVITY];
