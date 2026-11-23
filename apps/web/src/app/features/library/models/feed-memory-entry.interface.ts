import type { LibrarySort, LibraryView } from '@shelfmark/contracts';
import type { CardFields } from './card-fields.type';

/** What one feed remembers on this device (`FeedMemoryService`). */
export interface FeedMemoryEntry {
  view?: LibraryView;
  sort?: LibrarySort;
  /** The View menu's Grid size step, 1 to 6 (Shelf). */
  grid?: number;
  /** The card fields turned off or on in the View menu (Shelf). */
  fields?: CardFields;
}
