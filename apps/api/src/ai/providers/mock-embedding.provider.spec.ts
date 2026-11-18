import { MOCK_EMBEDDING_SYNONYMS } from '../models/mock-embedding-synonyms.const';
import { MockEmbeddingProvider, mockStem, mockStems, mockVector } from './mock-embedding.provider';

function cosine(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);
}

describe('MockEmbeddingProvider', () => {
  const provider = new MockEmbeddingProvider();

  it('describes itself as the 1,024-dimension mock model', () => {
    expect(provider).toMatchObject({ name: 'mock', model: 'mock-embed-1', dimensions: 1024 });
    expect(provider.minSimilarity).toBeGreaterThan(0);
  });

  it('is deterministic and L2-normalised, one vector per text in order', async () => {
    const texts = ['Angular signals and performance', 'Ramen in Tokyo', ''];
    const first = await provider.embed(texts, 'document');
    const second = await provider.embed(texts, 'document');
    expect(first).toEqual(second);
    if (!first.ok) throw new Error('expected vectors');
    expect(first.vectors).toHaveLength(3);
    for (const vector of first.vectors) {
      expect(vector).toHaveLength(1024);
      expect(Math.sqrt(cosine(vector, vector))).toBeCloseTo(1, 6);
      expect(vector.every((value) => Number.isFinite(value))).toBe(true);
    }
    expect(first.tokens).toBeGreaterThan(0);
  });

  it('brings shared stems and synonyms close and leaves unrelated texts apart', () => {
    const coat = mockVector('Title: Winter coat buying guide');
    const jacket = mockVector('warm jackets');
    const ramen = mockVector('Title: Best ramen in Tokyo');
    const noodles = mockVector('noodles');
    expect(cosine(coat, jacket)).toBeGreaterThan(0.3);
    expect(cosine(ramen, noodles)).toBeGreaterThan(0.3);
    expect(Math.abs(cosine(coat, ramen))).toBeLessThan(0.15);
    expect(cosine(mockVector('reactivity'), mockVector('Angular signals'))).toBeGreaterThan(0.3);
  });

  it('stems lightly, drops short and stop words, and keys synonyms by stem', () => {
    expect(mockStem('signals')).toBe('signal');
    expect(mockStem('Performance')).toBe('perform');
    expect(mockStem('notes')).toBe('note');
    expect(mockStem('speed')).toBe('perform');
    expect(mockStem('glass')).toBe('glass');
    expect(mockStems('the cat and an ox, about Signals')).toEqual(['cat', 'signal']);
    for (const [key, value] of Object.entries(MOCK_EMBEDDING_SYNONYMS)) {
      expect(key).not.toBe(value);
      expect(MOCK_EMBEDDING_SYNONYMS[value]).toBeUndefined();
    }
  });

  it('gives a text without words a direction of its own', () => {
    const empty = mockVector('!! ??');
    expect(Math.sqrt(cosine(empty, empty))).toBeCloseTo(1, 6);
    expect(empty).toEqual(mockVector(''));
  });

  it('fails a query containing ai-fail (e2e), never a document', async () => {
    await expect(provider.embed(['please AI-FAIL now'], 'query')).resolves.toEqual({
      ok: false,
      retryable: true,
    });
    expect((await provider.embed(['ai-fail'], 'document')).ok).toBe(true);
  });
});
