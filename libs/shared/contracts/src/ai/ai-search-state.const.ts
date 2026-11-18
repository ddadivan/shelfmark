/**
 * State of search by meaning for the session user (AI-3, ADR 0051): `off` (AI or the switch off),
 * `processing` (fewer than 80% of live links have a current vector), `ready`, `quota` (this month's
 * embeddings or search queries are used up), `unavailable` (the embedding provider failed recently).
 * Anything but `ready` means today's word search only.
 */
export const AI_SEARCH_STATE = {
  Off: 'off',
  Processing: 'processing',
  Ready: 'ready',
  Quota: 'quota',
  Unavailable: 'unavailable',
} as const;
