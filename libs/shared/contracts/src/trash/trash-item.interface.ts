import type { TrashItemKind } from './trash-item-kind.type';

/**
 * One entry of Trash. A folder entry stands for the whole subtree deleted with it (its subfolders
 * and links do not appear on their own); a link entry is a link deleted on its own.
 */
export interface TrashItem {
  kind: TrashItemKind;
  /** Link id or folder id. */
  id: string;
  /** Link title or folder name. */
  title: string;
  /** Link only: its address; `null` for a folder. */
  url: string | null;
  /** Link only: same-origin favicon path, as in `LinkResponse`; `null` otherwise. */
  faviconUrl: string | null;
  /** Link only: same-origin preview image path, as in `LinkResponse`; `null` otherwise. */
  imageUrl: string | null;
  /**
   * Name of the folder it was in (a folder's parent); `null` for Unsorted, the top level, or a
   * folder that no longer exists.
   */
  fromFolderName: string | null;
  /** Folder only: links deleted with it, subfolders included; `null` for a link. */
  linkCount: number | null;
  /** ISO time of the delete. */
  deletedAt: string;
  /** ISO time it is deleted for good (`deletedAt` plus the retention of the account). */
  expiresAt: string;
}
