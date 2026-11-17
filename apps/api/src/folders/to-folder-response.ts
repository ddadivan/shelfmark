import type {
  FolderColour,
  FolderEmoji,
  FolderIcon,
  FolderResponse,
  HexColour,
} from '@shelfmark/contracts';
import type { FolderCover } from './models/folder-cover.interface';
import type { FolderRow } from './models/folder-row.interface';
import { NO_COVER } from './folder-covers';

// The columns only ever hold values the API validated (the colour also has a CHECK), so the
// narrowing casts below cannot lie.
/** `cover` comes from `loadFolderCovers` (a stored cover that is no longer valid answers none). */
export function toFolderResponse(
  row: FolderRow,
  linkCount: number,
  cover: FolderCover = NO_COVER,
): FolderResponse {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    colour: row.colour as FolderColour | HexColour,
    icon: row.icon as FolderIcon | FolderEmoji,
    highlighted: row.highlighted,
    description: row.description,
    coverLinkId: cover.coverLinkId,
    coverUrl: cover.coverUrl,
    position: row.position,
    pinned: row.pinnedPosition !== null,
    linkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
