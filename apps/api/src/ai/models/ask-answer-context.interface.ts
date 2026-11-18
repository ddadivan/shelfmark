import type { AiTier } from '@shelfmark/contracts';
import type { AskLog } from './ask-log.interface';

/** What an Ask answer needs besides the question, and whether its question was refunded already. */
export interface AskAnswerContext {
  /** The day the question was counted on (for a refund). */
  day: string;
  tier: AiTier;
  log: AskLog;
  refunded: boolean;
}
