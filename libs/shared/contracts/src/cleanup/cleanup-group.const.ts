/**
 * Groups of the clean-up report (F5, ADR 0052). Additive: #397 adds `DeadLinks` with its own check
 * and apply action.
 */
export const CLEANUP_GROUP = {
  Duplicates: 'duplicates',
  SimilarTags: 'similar-tags',
} as const;
