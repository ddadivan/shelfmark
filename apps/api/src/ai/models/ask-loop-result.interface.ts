import type { AskGatheredResult } from './ask-gathered-result.interface';
import type { AskLoopOutcome } from './ask-loop-outcome.type';
import type { AskSearchRecord } from './ask-search-record.interface';
import type { AskStopReason } from './ask-stop-reason.type';
import type { AskUsageTokens } from './ask-usage-tokens.interface';

/** What one profile's tool loop did (counts for the logs, never content). */
export interface AskLoopResult {
  outcome: AskLoopOutcome;
  /** The last model call's stop reason, `null` when none ended. */
  stopReason: AskStopReason | null;
  /** Model calls made. */
  calls: number;
  /** Tool calls per tool name. */
  toolCalls: Record<string, number>;
  usage: AskUsageTokens;
  /** Library tool results, for the deep hand-over. */
  gathered: AskGatheredResult[];
  searches: AskSearchRecord[];
  /** Refs shown as cards, in order. */
  shown: number[];
}
