import type { LinkResponse } from '@shelfmark/contracts';

/**
 * The links of a folder with the ones pinned to its top first, in the order they were pinned; the
 * rest keep their order (the sort of the feed). Elsewhere the list is left as it is.
 */
export function pinnedFirst(links: readonly LinkResponse[], inFolder: boolean): LinkResponse[] {
  if (!inFolder) {
    return [...links];
  }
  const pinned = links
    .filter((link) => link.pinnedInFolderAt !== null)
    .sort((a, b) => (a.pinnedInFolderAt ?? '').localeCompare(b.pinnedInFolderAt ?? ''));
  return [...pinned, ...links.filter((link) => link.pinnedInFolderAt === null)];
}
