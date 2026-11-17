/** Error messages of the AI routes (#389–#391), shared so the web mock answers the same text. */
export const AI_ERROR_MESSAGE = {
  /** `PATCH /api/ai/settings` with no field to change. */
  NothingToUpdate: 'Send at least one setting to change',
  /** A job that does not exist or belongs to someone else. */
  JobNotFound: 'AI job not found',
  /** A suggestion that does not exist or belongs to someone else. */
  SuggestionNotFound: 'Suggestion not found',
  /** An AI action (rewrite, backfill) while AI is off for the user. */
  AiOff: 'AI is off',
  /** `POST /api/links/:id/ai/rewrite` while the summary is the user's own text. */
  SummaryIsUsers: 'The summary was written by you',
  /** `POST /api/ai/backfill` without the AI pack. */
  BackfillNotIncluded: 'Processing existing links needs the AI pack',
  /** `POST /api/ai/backfill` while a run is in progress. */
  BackfillRunning: 'Existing links are already being processed',
} as const;
