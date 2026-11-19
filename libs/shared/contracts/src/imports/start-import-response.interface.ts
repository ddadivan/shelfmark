import type { ImportFolderId } from './import-folder-id.interface';

/** `POST /api/imports` response. */
export interface StartImportResponse {
  id: string;
  /** Where links without a folder of the file go: the target folder, or `null` for Unsorted. */
  targetFolderId: string | null;
  folders: ImportFolderId[];
}
