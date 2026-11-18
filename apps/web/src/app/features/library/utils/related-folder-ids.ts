import type { MeaningMatch } from '@shelfmark/contracts';

/**
 * The distinct folders of related links, best first (Unsorted as `null`), leaving out the ones the
 * folder list does not know (a folder deleted meanwhile).
 */
export function relatedFolderIds(
  items: readonly MeaningMatch[],
  known: (id: string) => boolean,
): (string | null)[] {
  const ids: (string | null)[] = [];
  for (const { link } of items) {
    const id = link.folderId;
    if ((id === null || known(id)) && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}
