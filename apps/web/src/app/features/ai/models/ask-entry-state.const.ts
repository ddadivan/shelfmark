/**
 * Where one Ask question stands (`AskStore`): text is `streaming`, the answer is `done` (also when
 * stopped, cut or not found), the day or month `limit` is used, or it ended with an `error`.
 */
export const ASK_ENTRY_STATE = {
  Streaming: 'streaming',
  Done: 'done',
  Limit: 'limit',
  Error: 'error',
} as const;
