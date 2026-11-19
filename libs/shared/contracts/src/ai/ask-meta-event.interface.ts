import type { AskAllowance } from './ask-allowance.interface';
import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** First event, once the question was counted. */
export interface AskMetaEvent {
  type: typeof ASK_EVENT_TYPE.Meta;
  /** Allowance after this question was reserved. */
  allowance: AskAllowance;
}
