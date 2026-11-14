import type { LinkResponse } from '@shelfmark/contracts';

/** How many of `links` carry each tag (the bulk tags dialog shows "on 2 of 5"). */
export function tagCounts(links: readonly LinkResponse[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of links) {
    for (const name of link.tags) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

/** The link as it looks after the tags change: removals first (any case), then the additions not yet there. */
export function withTagsChanged(
  link: LinkResponse,
  change: { readonly add: readonly string[]; readonly remove: readonly string[] },
): LinkResponse {
  const removing = new Set(change.remove.map((name) => name.toLowerCase()));
  const kept = link.tags.filter((name) => !removing.has(name.toLowerCase()));
  const added = change.add.filter(
    (name) => !kept.some((tag) => tag.toLowerCase() === name.toLowerCase()),
  );
  return { ...link, tags: [...kept, ...added] };
}

/**
 * The links grouped by the folder they are in now, each already showing `to` (the undo of a bulk
 * move sends one request per group).
 */
export function groupedByFolder(
  links: readonly LinkResponse[],
  to: string | null,
): Map<string | null, LinkResponse[]> {
  const groups = new Map<string | null, LinkResponse[]>();
  for (const link of links) {
    groups.set(link.folderId, [...(groups.get(link.folderId) ?? []), { ...link, folderId: to }]);
  }
  return groups;
}
