/** One tag pair to apply: the other tag of the pair is merged into `keepTagId`. */
export interface CleanupApplyTagMerge {
  pairId: string;
  /** Either tag of the pair. */
  keepTagId: string;
}
