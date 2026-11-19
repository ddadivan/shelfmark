import type { ParsedImportFolder } from './parsed-import-folder.interface';
import type { ParsedImportLink } from './parsed-import-link.interface';

/** What a source read from a file: folders that hold at least one link, the links in file order. */
export interface ParsedImport {
  readonly folders: readonly ParsedImportFolder[];
  readonly links: readonly ParsedImportLink[];
  /** Entries that are not web pages (`javascript:`, `place:`, `file:`, …), left out. */
  readonly notWeb: number;
}
