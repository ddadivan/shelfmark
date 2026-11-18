import type { AskStopReason } from './ask-stop-reason.type';

/**
 * One piece of a provider's answer stream: text as it arrives, then exactly one `end` (with the token
 * counts for the logs) or one `error` (a failure; `retryable` for 429, 5xx, timeouts and the network).
 */
export type AskChunk =
  | { type: 'text'; text: string }
  | { type: 'end'; stopReason: AskStopReason; inputTokens: number; outputTokens: number }
  | { type: 'error'; retryable: boolean };
