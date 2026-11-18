import type { CleanupReport } from '@shelfmark/contracts';

/** State of `CleanupReportStore` (page-scoped). */
export interface CleanupReportState {
  report: CleanupReport | null;
  loading: boolean;
  /** The last read failed (shown only while there is no report yet). */
  failed: boolean;
  /** A run request is under way. */
  starting: boolean;
  applying: boolean;
  /** The "Include AI checks" switch (only offered while `report.aiAvailable`). */
  includeAi: boolean;
  /** Row ids (groups and pairs) the user unchecked; every row starts checked. */
  deselected: string[];
  /** Pair ids whose keep the user swapped ("Keep … instead"). */
  swapped: string[];
}
