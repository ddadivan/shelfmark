/**
 * What a provider hands back for a tag-synonyms request. `output` is the model's JSON, not yet
 * trusted: `parseTagSynonymsOutput` narrows it against the keys that were sent.
 */
export type TagSynonymsOutcome =
  { type: 'output'; output: unknown } | { type: 'refusal' } | { type: 'error'; retryable: boolean };
