import type { AskDepth } from '@shelfmark/contracts';
import type { AskThinking } from './ask-thinking.type';

/** One Ask model profile (ADR 0055 point 1). */
export interface AskModelProfile {
  depth: AskDepth;
  model: string;
  effort: 'low' | 'medium' | 'high';
  thinking: AskThinking;
  /** `max_tokens` of a round that may call tools. */
  roundMaxTokens: number;
  /** `max_tokens` of the forced answer (`tool_choice: none`). */
  finalMaxTokens: number;
  /** Whether the profile gets `request_deeper_answer`. */
  escalation: boolean;
}
