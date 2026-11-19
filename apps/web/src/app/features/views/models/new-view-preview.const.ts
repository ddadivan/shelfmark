import { PAGE_LIMIT } from '@shelfmark/contracts';

/**
 * The live count of the new view dialog: it asks one page of at most `Limit` links (the list has no
 * total), shows the first `Rows` and waits `DebounceMs` after the last change of a row.
 */
export const NEW_VIEW_PREVIEW = { Limit: PAGE_LIMIT.Max, Rows: 3, DebounceMs: 250 } as const;
