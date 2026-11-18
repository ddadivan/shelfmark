import type { AskAllowance } from './ask-allowance.interface';
import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** First event after retrieval, once the question was counted. */
export interface AskMetaEvent {
  type: typeof ASK_EVENT_TYPE.Meta;
  /** Allowance after this question was reserved. */
  allowance: AskAllowance;
  /** Links of the user sent as sources (1 to `ASK_LIMIT.ContextLinksMax`). */
  retrieved: number;
}
