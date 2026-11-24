import type { AiTier, AuthUser } from '@shelfmark/contracts';
import type { AskHistoryTurn } from './ask-history-turn.interface';
import type { AskLog } from './ask-log.interface';
import type { AskRecording } from './ask-recording.interface';
import type { AskSink } from './ask-sink.interface';
import type { LinkRefs } from '../ask/tools/link-refs';

/** One counted Ask question on its way through the loops. */
export interface AskRun {
  user: AuthUser;
  tier: AiTier;
  question: string;
  history: AskHistoryTurn[];
  refs: LinkRefs;
  includeNotes: boolean;
  searchReady: boolean;
  /** The day the question was counted on (for refunds). */
  day: string;
  sink: AskSink;
  started: number;
  log: AskLog;
  refunded: boolean;
  /** "Keep Ask history" is on: the finished turn is stored. */
  keepHistory: boolean;
  /** The user's stored conversation this turn continues, `null` for a new one. */
  conversationId: string | null;
  /** Steps and cards as they went out, for the stored turn. */
  recording: AskRecording;
}
