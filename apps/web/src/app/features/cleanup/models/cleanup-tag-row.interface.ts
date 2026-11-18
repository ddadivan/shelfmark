import type { CleanupTag } from '@shelfmark/contracts';

/** One similar-tags pair as the page shows it, after a possible "Keep … instead" swap. */
export interface CleanupTagRow {
  /** The report's pair id. */
  id: string;
  /** Found by AI (a model pair); rule pairs carry no mark. */
  ai: boolean;
  /** The tag that stays. */
  keep: CleanupTag;
  /** The tag merged into `keep` and removed. */
  merge: CleanupTag;
  selected: boolean;
}
