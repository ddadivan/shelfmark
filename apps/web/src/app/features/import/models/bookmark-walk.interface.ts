import type { BookmarkDraftFolder } from './bookmark-draft-folder.interface';
import type { ParsedImportLink } from './parsed-import-link.interface';

/** The state of one walk over a bookmark file. */
export interface BookmarkWalk {
  readonly folders: BookmarkDraftFolder[];
  readonly links: ParsedImportLink[];
  /** Name for a folder without one (translated by the caller). */
  readonly untitled: string;
  readonly now: number;
  notWeb: number;
}
