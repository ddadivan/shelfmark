/** What the share page shows. */
export const SHARE_STATE = {
  /** A usable URL arrived: the quick save form. */
  Form: 'form',
  /** No http(s) URL in the shared data: nothing is saved. */
  Invalid: 'invalid',
} as const;
