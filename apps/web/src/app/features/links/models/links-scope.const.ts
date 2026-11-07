/** Which links a feed page lists; each scope has its own route. `folder` needs `LinksFilter.folderId`. */
export const LINKS_SCOPE = {
  All: 'all',
  Unsorted: 'unsorted',
  Favorites: 'favorites',
  Folder: 'folder',
} as const;
