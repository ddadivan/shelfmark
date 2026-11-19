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
}
