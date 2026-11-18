/**
 * Clean-up limits (F5, ADR 0053): report groups, group size, model tag pairs, apply request sizes and
 * the entry card's interval after a dismissal, and how long the server holds a run's Undo (longer than
 * the 8 s toast, which pauses while hovered or focused).
 */
export const CLEANUP_LIMIT = {
  DuplicateGroupsMax: 100,
  GroupSizeMax: 5,
  TagPairsMax: 20,
  ApplyGroupsMax: 100,
  ApplyTagMergesMax: 20,
  CardIntervalDays: 30,
  UndoWindowMinutes: 10,
} as const;
