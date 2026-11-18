/** Client-facing clean-up error messages. */
export const CLEANUP_ERROR_MESSAGE = {
  Running: 'A clean-up check is already running.',
  EmptyApply: 'Select at least one change.',
  UndoGone: 'This clean-up can no longer be undone.',
} as const;
