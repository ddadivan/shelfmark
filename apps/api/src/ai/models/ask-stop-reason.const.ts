/**
 * How a provider's answer stream ended (server-only): `done` (the model finished), `tool-use` (it
 * called tools), `max-tokens` (cut at the output cap), `refusal` (the model declined; refunded,
 * ADR 0052 point 6).
 */
export const ASK_STOP_REASON = {
  Done: 'done',
  ToolUse: 'tool-use',
  MaxTokens: 'max-tokens',
  Refusal: 'refusal',
} as const;
