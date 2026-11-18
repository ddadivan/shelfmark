import { CLEANUP_LIMIT } from '@shelfmark/contracts';
import type { TagSynonymPair } from '../models/tag-synonym-pair.interface';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Narrows the model's tag-synonyms answer (never trusted): only keys that were sent, two distinct
 * keys per pair, each key in at most one pair (so no chains), no pair the rule step already found
 * (`known`, as `a|b` in either order), at most `TagPairsMax` pairs. Anything else is dropped.
 */
export function parseTagSynonymsOutput(
  output: unknown,
  sentKeys: ReadonlySet<string>,
  known: ReadonlySet<string> = new Set(),
): TagSynonymPair[] {
  if (!isRecord(output) || !Array.isArray(output['pairs'])) return [];
  const used = new Set<string>();
  const pairs: TagSynonymPair[] = [];
  for (const item of output['pairs'] as unknown[]) {
    if (pairs.length >= CLEANUP_LIMIT.TagPairsMax) break;
    if (!isRecord(item)) continue;
    const { keep, merge } = item;
    if (typeof keep !== 'string' || typeof merge !== 'string') continue;
    if (keep === merge || !sentKeys.has(keep) || !sentKeys.has(merge)) continue;
    if (used.has(keep) || used.has(merge)) continue;
    if (known.has(`${keep}|${merge}`) || known.has(`${merge}|${keep}`)) continue;
    used.add(keep);
    used.add(merge);
    pairs.push({ keep, merge });
  }
  return pairs;
}
