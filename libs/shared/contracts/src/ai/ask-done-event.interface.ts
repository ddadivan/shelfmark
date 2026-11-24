import type { AskAllowance } from './ask-allowance.interface';
import type { AskDepth } from './ask-depth.type';
import type { ASK_EVENT_TYPE } from './ask-event-type.const';
import type { AskSource } from './ask-source.interface';
import type { AskTurn } from './ask-turn.interface';

/** Last event of a stream that produced an answer. */
export interface AskDoneEvent {
  type: typeof ASK_EVENT_TYPE.Done;
  /**
   * Cited and shown links that are still live, ordered by `n`. A citation whose link was trashed
   * meanwhile has no entry here (the web renders that `cite` disabled).
   */
  sources: AskSource[];
  /** At least one search ran, every search found nothing, and the answer cites and shows nothing. */
  notFound: boolean;
  /** The answer was cut (hard stop, size cap or provider failure after text arrived). */
  truncated: boolean;
  allowance: AskAllowance;
  /** This turn as the web keeps it and sends it back in `AskRequest.history`. */
  turn: AskTurn;
  /** Which profile wrote the answer (logs and the web; not shown on the answer in v1). */
  depth: AskDepth;
  /**
   * The stored conversation this turn was appended to (pass it as `AskRequest.conversationId` for
   * the next question); `null` when nothing was stored ("Keep Ask history" off, or the write failed).
   */
  conversationId: string | null;
}
