import { LIBRARY_SORT } from '@shelfmark/contracts';

/**
 * Values of `?sort=` on the library page (PROJECT.md 5.1); the account's "Sort links by" uses the
 * same values. An absent `?sort=` means the feed's own last choice, else the account's default.
 */
export const FEED_SORT = LIBRARY_SORT;
