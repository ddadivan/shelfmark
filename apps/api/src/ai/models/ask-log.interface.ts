import type { AskDepth } from '@shelfmark/contracts';
import type { AskUsageTokens } from './ask-usage-tokens.interface';

/** What one Ask question did, for its log line: counts only, never the question, history or answer. */
export interface AskLog {
  outcome: string;
  depth: AskDepth;
  /** History turns sent back by the client. */
  history: number;
  /** Model calls of both profiles. */
  calls: number;
  /** Tool calls per tool name. */
  tools: Record<string, number>;
  cited: number;
  shown: number;
  tokens: AskUsageTokens;
}
