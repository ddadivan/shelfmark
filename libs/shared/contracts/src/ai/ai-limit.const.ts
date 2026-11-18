/**
 * Shared AI limits (#389–#391). `SummaryMax` is the stored summary length (user edits too),
 * `SuggestedTagsMax` the existing tags suggested per link (plus at most one new tag), `DraftPollMaxMs`
 * how long Add link waits for draft suggestions, `PendingSkeletonMs` how long a card shows the
 * summary skeleton after a save.
 */
export const AI_LIMIT = {
  SummaryMax: 300,
  SuggestedTagsMax: 3,
  DraftPollMaxMs: 8000,
  PendingSkeletonMs: 10000,
} as const;
