import type { ASK_THINKING } from './ask-thinking.const';

/** One of `ASK_THINKING`. */
export type AskThinking = (typeof ASK_THINKING)[keyof typeof ASK_THINKING];
