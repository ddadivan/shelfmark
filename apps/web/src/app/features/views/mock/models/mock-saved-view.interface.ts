import type { SavedViewIcon, SavedViewQuery } from '@shelfmark/contracts';

/** A view as the mock library stores it (counts are derived on every read). */
export interface MockSavedView {
  id: string;
  name: string;
  query: SavedViewQuery;
  /** `null` (or absent in older mock data) = the default glyph. */
  icon?: SavedViewIcon | null;
}
