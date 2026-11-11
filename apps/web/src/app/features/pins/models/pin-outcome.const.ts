/** What a pin request came to. */
export const PIN_OUTCOME = {
  Done: 'done',
  /** Already `PIN_LIMIT.Max` items are pinned. */
  Limit: 'limit',
  Failed: 'failed',
} as const;
