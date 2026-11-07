import type { FolderResponse } from './folder-response.interface';
import type { LibraryCounts } from './library-counts.interface';

/** `GET /api/folders` response: all folders as a flat list, ordered by name, plus the fixed-row counts. */
export interface ListFoldersResponse {
  items: FolderResponse[];
  /** Counts for "All links", "Unsorted" and "Favorites". */
  counts: LibraryCounts;
}
