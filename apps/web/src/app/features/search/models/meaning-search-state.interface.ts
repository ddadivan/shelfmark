import type { AiSearchStatus, MeaningMatch } from '@shelfmark/contracts';

/** The settled answer of `GET /api/ai/search` for one query. */
export interface MeaningSearchState {
  /** The query the answer is for; empty while there is none. */
  readonly query: string;
  readonly items: readonly MeaningMatch[];
  /** `null` when nothing was asked (off, too short) or the request failed. */
  readonly status: AiSearchStatus | null;
  /** This answer shows the "getting ready" line (the first one of the session that may). */
  readonly hint: boolean;
}
