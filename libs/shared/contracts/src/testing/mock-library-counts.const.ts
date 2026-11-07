import type { LibraryCounts } from '../folders/library-counts.interface';

/** Matches `MOCK_LINKS`: two links, one unsorted, one favorite. */
export const MOCK_LIBRARY_COUNTS: Readonly<LibraryCounts> = {
  all: 2,
  unsorted: 1,
  favorites: 1,
};
