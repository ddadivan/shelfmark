import type { FolderResponse, LinkResponse, TrashItemKind } from '@shelfmark/contracts';

/** One entry of the mock Trash: a link, or a folder with the subfolders and links deleted with it. */
export interface MockTrashEntry {
  kind: TrashItemKind;
  /** Link id or folder id. */
  id: string;
  /** ISO time of the delete. */
  deletedAt: string;
  /** Name of the folder it was in (a folder's parent); `null` for Unsorted or the top level. */
  fromFolderName: string | null;
  /** A link entry: the link; `null` for a folder. */
  link: LinkResponse | null;
  /** A folder entry: the folder first, then its subfolders; empty for a link. */
  folders: FolderResponse[];
  /** A folder entry: the links deleted with it; empty for a link. */
  links: LinkResponse[];
}
