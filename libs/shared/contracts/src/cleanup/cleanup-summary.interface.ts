/** `GET /api/cleanup/summary`: the monthly entry card on All links. */
export interface CleanupSummary {
  /** Show the card: something found and not dismissed in the last `CLEANUP_LIMIT.CardIntervalDays`. */
  show: boolean;
  /** Duplicate groups (exact now plus unapplied AI groups of the stored report). */
  duplicates: number;
  /** Similar-tag pairs of the stored report not yet applied. */
  similarTags: number;
}
