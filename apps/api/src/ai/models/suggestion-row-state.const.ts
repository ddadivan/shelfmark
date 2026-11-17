/**
 * Stored suggestion state (`link_suggestions.state`). `accepted` and `dismissed` are kept so a
 * reprocessed link never brings them back; only `suggested` and `auto-applied` are sent.
 */
export const SUGGESTION_ROW_STATE = {
  Suggested: 'suggested',
  AutoApplied: 'auto-applied',
  Accepted: 'accepted',
  Dismissed: 'dismissed',
} as const;
