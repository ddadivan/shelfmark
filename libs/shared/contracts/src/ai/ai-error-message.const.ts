/** Error messages of the AI routes (#389–#391), shared so the web mock answers the same text. */
export const AI_ERROR_MESSAGE = {
  /** `PATCH /api/ai/settings` with no field to change. */
  NothingToUpdate: 'Send at least one setting to change',
  /** A job that does not exist or belongs to someone else. */
  JobNotFound: 'AI job not found',
} as const;
