import { EMBEDDING_INPUT_TYPE } from '../models/embedding-input-type.const';
import { EMBEDDING_LIMIT } from '../models/embedding-limit.const';
import { MOCK_EMBEDDING_LIMIT } from '../models/mock-embedding-limit.const';
import { MOCK_EMBEDDING_SYNONYMS } from '../models/mock-embedding-synonyms.const';
import type { EmbedOutcome } from '../models/embed-outcome.type';
import type { EmbeddingInputType } from '../models/embedding-input-type.type';
import type { EmbeddingProvider } from '../models/embedding-provider.interface';

const WORD = /[\p{L}\p{N}]+/gu;
/** Suffixes stripped once, longest first, keeping at least four letters (`s` keeps three). */
const SUFFIXES = [
  'ations',
  'ation',
  'ances',
  'ance',
  'ences',
  'ence',
  'ities',
  'ity',
  'ings',
  'ing',
  'ers',
  'er',
  'ed',
  'es',
  'ly',
] as const;
const STOP_WORDS: ReadonlySet<string> = new Set([
  'the',
  'and',
  'for',
  'with',
  'about',
  'from',
  'that',
  'this',
  'into',
  'your',
  'are',
  'was',
  'how',
  'what',
  'why',
  'talk',
  'title',
  'tags',
  'summary',
  'note',
]);
/** Marks a text without any stem, so it still has a direction (a zero vector has no cosine). */
const EMPTY_STEM = '\u0000';
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Light stemming: lower case, one suffix stripped, then the synonym table. */
export function mockStem(word: string): string {
  const lower = word.toLowerCase();
  let stem = lower;
  const suffix = SUFFIXES.find((s) => lower.endsWith(s) && lower.length - s.length >= 4);
  if (suffix !== undefined) stem = lower.slice(0, -suffix.length);
  else if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length - 1 >= 3) {
    stem = lower.slice(0, -1);
  }
  return MOCK_EMBEDDING_SYNONYMS[stem] ?? stem;
}

/** The distinct stems of a text (words of three or more letters, stop words left out). */
export function mockStems(text: string): string[] {
  const stems = new Set<string>();
  for (const [word] of text.matchAll(WORD)) {
    if (word.length < MOCK_EMBEDDING_LIMIT.MinStemLength) continue;
    const lower = word.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    stems.add(mockStem(lower));
  }
  return [...stems];
}

function fnv1a(value: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

/** Feature hashing: every stem adds ±1 to a few hashed dimensions; the result is L2-normalised. */
export function mockVector(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_LIMIT.Dimensions).fill(0);
  const stems = mockStems(text);
  for (const stem of stems.length === 0 ? [EMPTY_STEM] : stems) {
    for (let k = 0; k < MOCK_EMBEDDING_LIMIT.HashesPerStem; k += 1) {
      const hash = fnv1a(`${stem}#${k}`);
      const at = hash % EMBEDDING_LIMIT.Dimensions;
      vector[at] = (vector[at] ?? 0) + ((hash >>> 16) & 1 ? 1 : -1);
    }
  }
  let norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    // Opposite signs cancelled out: fall back to the empty-text direction.
    vector[fnv1a(EMPTY_STEM) % EMBEDDING_LIMIT.Dimensions] = 1;
    norm = 1;
  }
  return vector.map((value) => value / norm);
}

/**
 * The embedding provider outside production and for demo users (ADR 0050 point 1): deterministic,
 * stateless, no network. Shared stems (and the synonym table) make texts close; a query containing
 * `ai-fail` answers a retryable failure for the e2e journeys.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly model = MOCK_EMBEDDING_LIMIT.Model;
  readonly dimensions = EMBEDDING_LIMIT.Dimensions;
  readonly minSimilarity = MOCK_EMBEDDING_LIMIT.MinSimilarity;

  embed(texts: readonly string[], inputType: EmbeddingInputType): Promise<EmbedOutcome> {
    if (
      inputType === EMBEDDING_INPUT_TYPE.Query &&
      texts.some((text) => text.toLowerCase().includes(MOCK_EMBEDDING_LIMIT.FailMarker))
    ) {
      return Promise.resolve({ ok: false, retryable: true });
    }
    const vectors = texts.map((text) => mockVector(text));
    const tokens = texts.reduce((sum, text) => sum + mockStems(text).length, 0);
    return Promise.resolve({ ok: true, vectors, tokens });
  }
}
