/** What a Trash entry is: a link deleted on its own, or a folder deleted with its subfolders and links. */
export const TRASH_ITEM_KIND = {
  Link: 'link',
  Folder: 'folder',
} as const;
