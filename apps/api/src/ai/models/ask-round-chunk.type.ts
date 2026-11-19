import type { AskAssistantBlock } from './ask-assistant-block.type';
import type { AskStopReason } from './ask-stop-reason.type';
import type { AskUsageTokens } from './ask-usage-tokens.interface';

/**
 * One piece of a model call of the Ask loop: answer text as it arrives, the start of a tool call
 * (first output, the activity can show), then exactly one `end` (the assistant blocks unchanged, tool
 * calls included, and the token counts) or one `error`.
 */
export type AskRoundChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_start'; name: string }
  | { type: 'end'; stopReason: AskStopReason; blocks: AskAssistantBlock[]; usage: AskUsageTokens }
  | { type: 'error'; retryable: boolean };
