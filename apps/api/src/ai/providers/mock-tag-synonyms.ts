import { MOCK_TAG_SYNONYMS } from '../models/mock-tag-synonyms.const';
import type { TagSynonymsInput } from '../models/tag-synonyms-input.interface';
import type { TagSynonymsOutcome } from '../models/tag-synonyms-outcome.type';

/**
 * The mock's tag-synonyms answer: for each set of `MOCK_TAG_SYNONYMS.Sets`, the first listed tag
 * present (the input is most used first) is kept and the next one present is merged into it.
 */
export function mockTagSynonyms(input: TagSynonymsInput): TagSynonymsOutcome {
  const names = input.tags.map((tag) => tag.name.toLowerCase());
  if (names.some((name) => name.includes(MOCK_TAG_SYNONYMS.FailMarker))) {
    return { type: 'error', retryable: true };
  }
  if (names.some((name) => name.includes(MOCK_TAG_SYNONYMS.RefuseMarker))) {
    return { type: 'refusal' };
  }
  const pairs: { keep: string; merge: string }[] = [];
  for (const set of MOCK_TAG_SYNONYMS.Sets) {
    const present = input.tags.filter((tag) =>
      (set as readonly string[]).includes(tag.name.toLowerCase()),
    );
    const [keep, merge] = present;
    if (keep !== undefined && merge !== undefined) pairs.push({ keep: keep.key, merge: merge.key });
  }
  return { type: 'output', output: { pairs } };
}
