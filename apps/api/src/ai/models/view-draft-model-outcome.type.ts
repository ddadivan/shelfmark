/**
 * What a provider hands back for a view-from-a-phrase request. `output` is the model's JSON, not yet
 * trusted: `parseViewDraftOutput` (contracts) narrows it against the user's folders and tags.
 */
export type ViewDraftModelOutcome =
  { type: 'output'; output: unknown } | { type: 'refusal' } | { type: 'error'; retryable: boolean };
