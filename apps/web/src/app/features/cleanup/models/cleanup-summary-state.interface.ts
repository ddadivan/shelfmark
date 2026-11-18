import type { CleanupSummary } from '@shelfmark/contracts';

/** State of `CleanupSummaryStore`: the entry card's counts, `null` until loaded. */
export interface CleanupSummaryState {
  summary: CleanupSummary | null;
}
