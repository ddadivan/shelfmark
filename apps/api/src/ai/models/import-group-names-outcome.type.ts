/**
 * What a provider hands back for an import-group naming request. `output` is the model's JSON, not
 * yet trusted: `parseImportGroupNamesOutput` narrows it against the keys that were sent.
 */
export type ImportGroupNamesOutcome =
  { type: 'output'; output: unknown } | { type: 'refusal' } | { type: 'error'; retryable: boolean };
