/**
 * State of a suggestion sent to the client: `suggested` is a dashed chip; `auto-applied` was applied
 * by Automatic mode and keeps the AI mark with Undo until the user keeps or changes it. Accepted and
 * dismissed suggestions are stored by the API but never sent.
 */
export const SUGGESTION_STATE = {
  Suggested: 'suggested',
  AutoApplied: 'auto-applied',
} as const;
