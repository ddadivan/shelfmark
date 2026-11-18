import { CLEANUP_LIMIT, linkHost } from '@shelfmark/contracts';
import { wordStems } from '../ai/search/word-stems';
import { NEAR_DUPLICATE_LIMIT } from './models/near-duplicate-limit.const';
import type { NearDuplicateLink } from './models/near-duplicate-link.interface';

const bareHost = (url: string): string | null => linkHost(url)?.replace(/^www\./, '') ?? null;

/** Equal after dropping `www.`, or one a subdomain of the other. */
export function sameHostFamily(a: string, b: string): boolean {
  const first = bareHost(a);
  const second = bareHost(b);
  if (first === null || second === null || first === '' || second === '') return false;
  return first === second || first.endsWith(`.${second}`) || second.endsWith(`.${first}`);
}

/** Jaccard overlap of the title word stems (0 when either has none). */
export function titleOverlap(a: string, b: string): number {
  const first = new Set(wordStems(a));
  const second = new Set(wordStems(b));
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  for (const stem of first) if (second.has(stem)) shared += 1;
  return shared / (first.size + second.size - shared);
}

/** The near-duplicate condition: close vectors and the same site family or overlapping titles. */
export function isNearDuplicate(
  similarity: number,
  a: NearDuplicateLink,
  b: NearDuplicateLink,
): boolean {
  if (similarity < NEAR_DUPLICATE_LIMIT.SimilarityMin) return false;
  return (
    sameHostFamily(a.url, b.url) ||
    titleOverlap(a.title, b.title) >= NEAR_DUPLICATE_LIMIT.TitleOverlapMin
  );
}

/**
 * Union-find over the pairs into groups of at most `GroupSizeMax` links; links in `excluded` (already
 * in an exact group) are left out, and an edge that would grow a group past the cap is skipped.
 * Pairs are taken in sorted order, members come out sorted, groups ordered by their first member.
 */
export function groupNearPairs(
  pairs: readonly (readonly [string, string])[],
  excluded: ReadonlySet<string>,
  max: number = CLEANUP_LIMIT.GroupSizeMax,
): string[][] {
  const parent = new Map<string, string>();
  const size = new Map<string, number>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    parent.set(id, root);
    return root;
  };
  const add = (id: string) => {
    if (!parent.has(id)) {
      parent.set(id, id);
      size.set(id, 1);
    }
  };
  const sorted = pairs
    .map(([a, b]) => (a < b ? [a, b] : [b, a]) as [string, string])
    .sort((x, y) => (x[0] + x[1] < y[0] + y[1] ? -1 : 1));
  for (const [a, b] of sorted) {
    if (a === b || excluded.has(a) || excluded.has(b)) continue;
    add(a);
    add(b);
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) continue;
    const total = (size.get(rootA) ?? 1) + (size.get(rootB) ?? 1);
    if (total > max) continue;
    parent.set(rootB, rootA);
    size.set(rootA, total);
  }
  const groups = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }
  return [...groups.values()]
    .filter((members) => members.length >= 2)
    .map((members) => members.sort())
    .sort((x, y) => ((x[0] ?? '') < (y[0] ?? '') ? -1 : 1));
}
