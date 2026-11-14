import type { LibrarySort, LibraryView } from '@shelfmark/contracts';

/** What one feed remembers on this device (`FeedMemoryService`). */
export interface FeedMemoryEntry {
  view?: LibraryView;
  sort?: LibrarySort;
}
