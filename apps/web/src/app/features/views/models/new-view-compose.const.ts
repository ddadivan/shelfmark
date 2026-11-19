/** How the phrase stands: nothing yet, AI working, a draft in the rows, or a line instead. */
export const NEW_VIEW_COMPOSE = {
  Idle: 'idle',
  Composing: 'composing',
  Done: 'done',
  Quota: 'quota',
  Unavailable: 'unavailable',
} as const;
