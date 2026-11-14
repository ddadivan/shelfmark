import type { LinkResponse } from '@shelfmark/contracts';
import type { LinksFilter } from '../features/links/models/links-filter.type';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';

/**
 * Whether an edited link still belongs in the open feed. A favorite flag never removes it (an
 * unfavorited link stays until the next load); leaving "Unsorted" or the open folder does.
 */
export function staysAfterEdit(filter: LinksFilter, link: LinkResponse): boolean {
  switch (filter.scope) {
    case LINKS_SCOPE.Unsorted:
      return link.folderId === null;
    case LINKS_SCOPE.Folder:
      return link.folderId === filter.folderId;
    default:
      return true;
  }
}

/** `link` with the tag `from` renamed to `to` (or dropped for `null`); other tags keep their order, no duplicates. */
export function retagLink(link: LinkResponse, from: string, to: string | null): LinkResponse {
  if (!link.tags.some((name) => name.toLowerCase() === from.toLowerCase())) {
    return link;
  }
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const name of link.tags) {
    const next = name.toLowerCase() === from.toLowerCase() ? to : name;
    if (next !== null && !seen.has(next.toLowerCase())) {
      seen.add(next.toLowerCase());
      tags.push(next);
    }
  }
  return { ...link, tags };
}

/** A copy of `list` with `item` at `index` (at the end when the list is shorter). */
export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const copy = [...list];
  copy.splice(Math.min(index, copy.length), 0, item);
  return copy;
}
