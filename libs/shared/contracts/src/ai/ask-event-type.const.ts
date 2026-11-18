/**
 * Event types of the `POST /api/ai/ask` stream (AI-4, ADR 0052): one JSON object per SSE `data:`
 * line. `meta` after retrieval, `text` and `cite` while the answer streams, then exactly one `done`
 * or `error` ends the stream.
 */
export const ASK_EVENT_TYPE = {
  Meta: 'meta',
  Text: 'text',
  Cite: 'cite',
  Done: 'done',
  Error: 'error',
} as const;
