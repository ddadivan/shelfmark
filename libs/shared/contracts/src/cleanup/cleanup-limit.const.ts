/**
 * Clean-up limits (F5, ADR 0052): report groups, group size, model tag pairs, apply request sizes and
 * the entry card's interval after a dismissal.
 */
export const CLEANUP_LIMIT = {
  DuplicateGroupsMax: 100,
  GroupSizeMax: 5,
  TagPairsMax: 20,
  ApplyGroupsMax: 100,
  ApplyTagMergesMax: 20,
  CardIntervalDays: 30,
} as const;
