import type { FolderColour, FolderResponse } from '@shelfmark/contracts';
import type { ToastFolder } from '@shelfmark/ui';

/** Glyph of the tile for Unsorted (the inbox, as in the sidebar). */
const UNSORTED_ICON = 'inbox';

/**
 * The folder tile that leads a `moved` toast: the folder's colour and glyph (the colour as the
 * account shows it), the inbox for Unsorted (`folder` is `undefined`).
 */
export function toastFolder(
  folder: FolderResponse | undefined,
  shownColour: (colour: FolderColour | string) => FolderColour | string,
): ToastFolder {
  return folder
    ? { colour: shownColour(folder.colour), icon: folder.icon }
    : { icon: UNSORTED_ICON };
}
