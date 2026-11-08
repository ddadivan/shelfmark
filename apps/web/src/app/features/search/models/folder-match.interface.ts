import type { FolderResponse } from '@shelfmark/contracts';

/** A folder that matches the search, with its path ("Work / Angular") for display. */
export interface FolderMatch {
  readonly folder: FolderResponse;
  readonly path: string;
}
