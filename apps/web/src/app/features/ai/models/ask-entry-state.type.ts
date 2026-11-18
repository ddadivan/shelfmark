import type { ASK_ENTRY_STATE } from './ask-entry-state.const';

/** One of `ASK_ENTRY_STATE`. */
export type AskEntryState = (typeof ASK_ENTRY_STATE)[keyof typeof ASK_ENTRY_STATE];
