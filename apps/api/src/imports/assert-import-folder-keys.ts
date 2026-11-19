import { BadRequestException } from '@nestjs/common';
import { IMPORT_ERROR_MESSAGE, type ImportFolder } from '@shelfmark/contracts';

/**
 * 400 `FolderKeys` unless every key is unique and every `parentKey` is the key of an EARLIER folder
 * (so parents are created before their children and there is no cycle).
 */
export function assertImportFolderKeys(folders: readonly ImportFolder[]): void {
  const seen = new Set<string>();
  for (const folder of folders) {
    if (seen.has(folder.key)) throw new BadRequestException(IMPORT_ERROR_MESSAGE.FolderKeys);
    if (folder.parentKey !== null && !seen.has(folder.parentKey)) {
      throw new BadRequestException(IMPORT_ERROR_MESSAGE.FolderKeys);
    }
    seen.add(folder.key);
  }
}
