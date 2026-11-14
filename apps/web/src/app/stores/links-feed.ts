import type { LinkResponse } from '@shelfmark/contracts';
import type { LinksFilter } from '../features/links/models/links-filter.type';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { inFilter } from '../features/links/utils/links-filter';

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

/** Where a link that has no remembered slot goes: after the links pinned to the top of a folder. */
function afterPinned(entities: readonly LinkResponse[]): number {
  const first = entities.findIndex((item) => item.pinnedInFolderAt === null);
  return first < 0 ? entities.length : first;
}

/**
 * The feed `entities` of `filter` after `link` changed: a link that still belongs stays (replaced
 * in place); one that left is removed and its slot remembered in `slots`; one that belongs again
 * comes back at its remembered slot. A link the feed never held that now belongs to the open
 * folder or Unsorted is inserted after the pinned links (other scopes load it with the next page).
 * Pure apart from `slots`; returns `entities` itself when nothing changes.
 */
export function placeLink(
  entities: readonly LinkResponse[],
  filter: LinksFilter,
  link: LinkResponse,
  slots: Map<string, number>,
): readonly LinkResponse[] {
  const index = entities.findIndex((item) => item.id === link.id);
  if (index >= 0) {
    if (staysAfterEdit(filter, link)) {
      return entities.map((item, at) => (at === index ? link : item));
    }
    slots.set(link.id, index);
    return entities.filter((item) => item.id !== link.id);
  }
  const slot = slots.get(link.id);
  if (slot !== undefined) {
    if (!inFilter(filter, link)) {
      return entities;
    }
    slots.delete(link.id);
    return insertAt(entities, slot, link);
  }
  const takesNewcomers =
    (filter.scope === LINKS_SCOPE.Folder || filter.scope === LINKS_SCOPE.Unsorted) &&
    inFilter(filter, link);
  return takesNewcomers ? insertAt(entities, afterPinned(entities), link) : entities;
}

/**
 * `placeLink` for links that changed together (a bulk move). Links that leave are taken out from
 * the end of the feed backwards, so each remembers its slot in the feed as it was; links that come
 * back go in from the first slot onwards, so each lands where it was.
 */
export function placeLinks(
  entities: readonly LinkResponse[],
  filter: LinksFilter,
  links: readonly LinkResponse[],
  slots: Map<string, number>,
): readonly LinkResponse[] {
  const indexOf = new Map(entities.map((item, index) => [item.id, index]));
  const held = links
    .filter((link) => indexOf.has(link.id))
    .sort((a, b) => (indexOf.get(b.id) ?? 0) - (indexOf.get(a.id) ?? 0));
  const others = links
    .filter((link) => !indexOf.has(link.id))
    .sort((a, b) => (slots.get(a.id) ?? Infinity) - (slots.get(b.id) ?? Infinity));
  return [...held, ...others].reduce(
    (list, link) => placeLink(list, filter, link, slots),
    entities,
  );
}
