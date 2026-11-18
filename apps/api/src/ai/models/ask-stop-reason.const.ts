/**
 * How a provider's answer stream ended (server-only): `done` (the model finished), `max-tokens` (cut
 * at the output cap), `refusal` (the model declined; refunded, ADR 0052 point 6).
 */
export const ASK_STOP_REASON = {
  Done: 'done',
  MaxTokens: 'max-tokens',
  Refusal: 'refusal',
} as const;
