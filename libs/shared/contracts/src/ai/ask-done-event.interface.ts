import type { AskAllowance } from './ask-allowance.interface';
import type { ASK_EVENT_TYPE } from './ask-event-type.const';
import type { AskSource } from './ask-source.interface';

/** Last event of a stream that produced an answer (or found nothing). */
export interface AskDoneEvent {
  type: typeof ASK_EVENT_TYPE.Done;
  /**
   * Cited links that are still live, ordered by `n`. A citation whose link was trashed meanwhile
   * has no entry here (the web renders that `cite` disabled).
   */
  sources: AskSource[];
  /** Nothing in the user's links answers the question (no sources, or none cited). */
  notFound: boolean;
  /** The answer was cut (hard stop, size cap or provider failure after text arrived). */
  truncated: boolean;
  allowance: AskAllowance;
}
