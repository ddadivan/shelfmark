import {
  IMPORT_LIMIT,
  type ImportGroup,
  type ImportGroupLink,
  type ImportGroupsResponse,
} from '@shelfmark/contracts';
import { MOCK_GROUP_TOPICS } from './models/mock-group-topics.const';

/** A group needs this many links; fewer go to "Other". */
const GROUP_MIN = 2;

/** An existing folder the mock can file a group into. */
export interface MockGroupFolder {
  readonly id: string;
  readonly name: string;
}

/**
 * Deterministic AI groups for the mock API: a link joins the first topic whose words appear in its
 * host or title, topics with fewer than two links and links that fit none go to `rest`, the biggest
 * topics come first (ties by topic order) and a topic named like one of the user's folders (case
 * insensitive) files into it ("already there").
 */
export function mockImportGroups(
  links: readonly ImportGroupLink[],
  folders: readonly MockGroupFolder[],
): ImportGroupsResponse {
  const buckets = MOCK_GROUP_TOPICS.map(() => [] as number[]);
  links.forEach((link, index) => {
    const text = `${hostOf(link.url)} ${link.title}`.toLowerCase();
    const topic = MOCK_GROUP_TOPICS.findIndex((item) =>
      item.words.some((word) => text.includes(word)),
    );
    if (topic !== -1) buckets[topic].push(index);
  });
  const ranked = buckets
    .map((linkIndexes, topic) => ({ linkIndexes, topic }))
    .filter((bucket) => bucket.linkIndexes.length >= GROUP_MIN)
    .sort((a, b) => b.linkIndexes.length - a.linkIndexes.length || a.topic - b.topic)
    .slice(0, IMPORT_LIMIT.GroupsMax);
  const kept = new Set(ranked.flatMap((bucket) => bucket.linkIndexes));
  const groups: ImportGroup[] = ranked.map((bucket, position) => {
    const name = MOCK_GROUP_TOPICS[bucket.topic].name;
    const existing = folders.find((folder) => folder.name.toLowerCase() === name.toLowerCase());
    return {
      key: `g${position + 1}`,
      name,
      folderId: existing?.id ?? null,
      linkIndexes: bucket.linkIndexes,
    };
  });
  const rest = links.map((_, index) => index).filter((index) => !kept.has(index));
  return { groups, rest, charged: links.length };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
