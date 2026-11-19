import type { ImportFolder } from './import-folder.interface';
import type { ImportSource } from './import-source.type';

/**
 * `POST /api/imports` body: records the import and creates its folders in one transaction. The
 * target is `targetFolderId` (a live own folder), or a new folder named `newFolderName`, or
 * neither (Unsorted; the file's top-level folders become top-level folders).
 */
export interface StartImportRequest {
  source: ImportSource;
  /** The file name as chosen, at most `IMPORT_LIMIT.FileNameMax` characters. */
  fileName: string;
  targetFolderId?: string;
  newFolderName?: string;
  /** The file's folders to create below the target; empty to flatten. */
  folders: ImportFolder[];
  /**
   * The user chose "AI groups by topic": imported links get the AI pass afterwards (summaries, type,
   * suggestions), counted against the backfill allowance and never the monthly one. Without it the
   * import runs no AI job (ADR 0056 decision 9).
   */
  aiPass?: boolean;
}
