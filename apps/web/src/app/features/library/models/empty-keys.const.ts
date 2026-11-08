import { LINKS_SCOPE } from '../../links/models/links-scope.const';

/** Translation key prefix of the empty state of each feed scope (folders use their own). */
export const EMPTY_KEYS = {
  [LINKS_SCOPE.All]: 'library.empty.all',
  [LINKS_SCOPE.Unsorted]: 'library.empty.unsorted',
  [LINKS_SCOPE.Favorites]: 'library.empty.favorites',
  [LINKS_SCOPE.Folder]: 'library.emptyFolder',
} as const;
