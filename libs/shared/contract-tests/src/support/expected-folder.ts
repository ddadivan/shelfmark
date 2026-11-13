import { FOLDER_DEFAULT_COLOUR, FOLDER_DEFAULT_ICON } from '@shelfmark/contracts';
import { ANY } from './any.const';

/** The expected `FolderResponse` of a folder: defaults of a new, unstyled, empty folder, then `fields`. */
export function expectedFolder(
  name: string,
  fields: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: ANY.id,
    parentId: null,
    name,
    colour: FOLDER_DEFAULT_COLOUR,
    icon: FOLDER_DEFAULT_ICON,
    position: 0,
    pinned: false,
    linkCount: 0,
    createdAt: ANY.time,
    updatedAt: ANY.time,
    ...fields,
  };
}
