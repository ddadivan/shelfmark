import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** A citation at this point of the answer; `n` matches an `AskSource.n` of the `done` event. */
export interface AskCiteEvent {
  type: typeof ASK_EVENT_TYPE.Cite;
  /** 1-based, numbered by first appearance in the answer. */
  n: number;
}
