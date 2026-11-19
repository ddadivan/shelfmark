/**
 * Event types of the `POST /api/ai/ask` stream (AI-4, ADR 0052 and 0055): one JSON object per SSE
 * `data:` line. `meta` once the question was counted, `activity` while tools run, `text`, `cite` and
 * `links` while the answer streams, then exactly one `done` or `error` ends the stream.
 */
export const ASK_EVENT_TYPE = {
  Meta: 'meta',
  Activity: 'activity',
  Text: 'text',
  Cite: 'cite',
  Links: 'links',
  Done: 'done',
  Error: 'error',
} as const;
