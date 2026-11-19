import type { ASK_TOOL_CHOICE } from './ask-tool-choice.const';

/** One of `ASK_TOOL_CHOICE`. */
export type AskToolChoice = (typeof ASK_TOOL_CHOICE)[keyof typeof ASK_TOOL_CHOICE];
