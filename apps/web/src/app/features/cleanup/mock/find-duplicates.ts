import { CLEANUP_LIMIT, linkHost, normalizeUrl, type LinkResponse } from '@shelfmark/contracts';

/** Oldest save first (then the smaller id), like the API's `ORDER BY created_at, id`. */
function oldestFirst(a: LinkResponse, b: LinkResponse): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Exact duplicates over the mock library, like the API's grouped query: links sharing a normalised
 * address, oldest groups first, at most `DuplicateGroupsMax` groups of the `GroupSizeMax` oldest
 * saves. Answers the link ids per group.
 */
export function exactDuplicateIds(links: readonly LinkResponse[]): string[][] {
  const groups = new Map<string, LinkResponse[]>();
  for (const link of [...links].sort(oldestFirst)) {
    const key = normalizeUrl(link.url);
    groups.set(key, [...(groups.get(key) ?? []), link]);
  }
  return [...groups.values()]
    .filter((members) => members.length > 1)
    .slice(0, CLEANUP_LIMIT.DuplicateGroupsMax)
    .map((members) => members.slice(0, CLEANUP_LIMIT.GroupSizeMax).map((link) => link.id));
}

/** `www.` dropped: the same host, or one a subdomain of the other. */
function sameHostFamily(a: string, b: string): boolean {
  const [x, y] = [a, b].map((host) => host.replace(/^www\./, ''));
  return x === y || (x ?? '').endsWith(`.${y}`) || (y ?? '').endsWith(`.${x}`);
}

/** What the mock embeddings see: identical title, tags and summary give similarity 1. */
function vectorText(link: LinkResponse): string {
  return [
    link.title.trim().toLowerCase(),
    [...link.tags].sort().join(','),
    link.summary ?? '',
  ].join('\n');
}

/**
 * Near-duplicates over the mock library ("Same page", AI): links outside `exclude` with the same
 * mock vector, a different address and the same host family, grouped by union-find into groups of
 * at most `GroupSizeMax`.
 */
export function nearDuplicateIds(
  links: readonly LinkResponse[],
  exclude: ReadonlySet<string>,
): string[][] {
  const candidates = [...links].sort(oldestFirst).filter((link) => !exclude.has(link.id));
  const groups: LinkResponse[][] = [];
  for (const link of candidates) {
    const host = linkHost(link.url) ?? '';
    const group = groups.find(
      (members) =>
        members.length < CLEANUP_LIMIT.GroupSizeMax &&
        members.every(
          (other) =>
            vectorText(other) === vectorText(link) &&
            normalizeUrl(other.url) !== normalizeUrl(link.url) &&
            sameHostFamily(linkHost(other.url) ?? '', host),
        ),
    );
    if (group) {
      group.push(link);
    } else {
      groups.push([link]);
    }
  }
  return groups
    .filter((members) => members.length > 1)
    .map((members) => members.map((link) => link.id));
}
