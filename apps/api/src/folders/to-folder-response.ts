import type {
  FolderColour,
  FolderEmoji,
  FolderIcon,
  FolderResponse,
  HexColour,
} from '@shelfmark/contracts';
import type { FolderRow } from './models/folder-row.interface';

// The columns only ever hold values the API validated (the colour also has a CHECK), so the
// narrowing casts below cannot lie.
export function toFolderResponse(row: FolderRow, linkCount: number): FolderResponse {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    colour: row.colour as FolderColour | HexColour,
    icon: row.icon as FolderIcon | FolderEmoji,
    position: row.position,
    pinned: row.pinnedPosition !== null,
    linkCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
