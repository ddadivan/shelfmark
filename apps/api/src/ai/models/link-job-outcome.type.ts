/**
 * What a provider hands back for one link job. `output` is the model's JSON, not yet trusted: the
 * runner validates it with `parseLinkOutput`. `retryable` errors (429, 5xx, timeout, network) go
 * back to the queue; the others (a rejected key or request) fail the job at once.
 */
export type LinkJobOutcome =
  { type: 'output'; output: unknown } | { type: 'refusal' } | { type: 'error'; retryable: boolean };
