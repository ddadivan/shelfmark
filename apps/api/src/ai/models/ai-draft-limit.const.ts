/**
 * Drafts from Add link (ADR 0049 point 4): at most `OpenPerWindowMax` drafts a user has not saved yet
 * within `WindowMs`; past it `POST /api/ai/drafts` answers `skipped` (`quota`) without a row. The
 * sweep deletes unattached drafts after a day anyway.
 */
export const AI_DRAFT_LIMIT = {
  OpenPerWindowMax: 20,
  WindowMs: 24 * 60 * 60_000,
} as const;
