/** Where the preview of the typed URL stands. */
export const PREVIEW_STATE = {
  /** No valid URL yet. */
  Idle: 'idle',
  Loading: 'loading',
  Ready: 'ready',
  /** The preview request failed; the link can still be saved. */
  Failed: 'failed',
} as const;
