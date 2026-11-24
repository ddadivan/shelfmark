import type { ValidationError } from '@angular/forms/signals';
import { FOLDER_LIMIT } from '@shelfmark/contracts';
import { FOLDER_NAME_ERROR } from '../models/folder-name-error.const';

/**
 * The message for a folder name (Folder settings, Shelf 04-organise): empty or blank, or longer
 * than `FOLDER_LIMIT.NameMax`; `undefined` when the name is fine. `translate` gets the key and the
 * `max` parameter.
 */
export function folderNameError(
  value: string,
  translate: (key: string, params?: Record<string, number>) => string,
): ValidationError.WithoutFieldTree | undefined {
  if (value.trim() === '') {
    return { kind: FOLDER_NAME_ERROR.Blank, message: translate('folders.name.required') };
  }
  if (value.length > FOLDER_LIMIT.NameMax) {
    return {
      kind: FOLDER_NAME_ERROR.TooLong,
      message: translate('folders.name.tooLong', { max: FOLDER_LIMIT.NameMax }),
    };
  }
  return undefined;
}
