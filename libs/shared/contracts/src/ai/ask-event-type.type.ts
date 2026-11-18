import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** One of `ASK_EVENT_TYPE`. */
export type AskEventType = (typeof ASK_EVENT_TYPE)[keyof typeof ASK_EVENT_TYPE];
