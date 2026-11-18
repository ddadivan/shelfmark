import type { AskAllowance } from './ask-allowance.interface';
import type { AskErrorReason } from './ask-error-reason.type';
import type { ASK_EVENT_TYPE } from './ask-event-type.const';

/** Last event of a stream that produced no answer. */
export interface AskErrorEvent {
  type: typeof ASK_EVENT_TYPE.Error;
  reason: AskErrorReason;
  /** `false`: the question was not counted (or was refunded), so "Try again" is offered. */
  counted: boolean;
  /** Current allowance, `null` when it could not be read (AI off). */
  allowance: AskAllowance | null;
}
