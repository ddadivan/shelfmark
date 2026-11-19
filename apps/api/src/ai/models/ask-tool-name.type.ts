import type { ASK_TOOL_NAME } from './ask-tool-name.const';

/** One of `ASK_TOOL_NAME`. */
export type AskToolName = (typeof ASK_TOOL_NAME)[keyof typeof ASK_TOOL_NAME];
