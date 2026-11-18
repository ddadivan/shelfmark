import { AI_MEANING_LIMIT } from '../models/ai-meaning-limit.const';
import { QueryEmbeddingCache } from './query-embedding-cache.service';

describe('QueryEmbeddingCache', () => {
  it('keys by user, model and query, never by the text alone', () => {
    const cache = new QueryEmbeddingCache();
    const a = cache.key('user-a', 'mock', 'coat');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('coat');
    expect(cache.key('user-b', 'mock', 'coat')).not.toBe(a);
    expect(cache.key('user-a', 'voyage', 'coat')).not.toBe(a);
    expect(cache.key('user-a', 'mock', 'coat')).toBe(a);
  });

  it('answers an entry until it expires', () => {
    const cache = new QueryEmbeddingCache();
    cache.set('k', '[1]', 1000);
    expect(cache.get('k', 1000 + AI_MEANING_LIMIT.CacheTtlMs - 1)).toBe('[1]');
    expect(cache.get('k', 1000 + AI_MEANING_LIMIT.CacheTtlMs)).toBeNull();
    expect(cache.get('missing')).toBeNull();
  });

  it('evicts the least recently used entry past the size', () => {
    const cache = new QueryEmbeddingCache();
    for (let i = 0; i < AI_MEANING_LIMIT.CacheSize; i += 1) cache.set(`k${i}`, `[${i}]`);
    expect(cache.get('k0')).toBe('[0]');
    cache.set('new', '[x]');
    expect(cache.size).toBe(AI_MEANING_LIMIT.CacheSize);
    expect(cache.get('k1')).toBeNull();
    expect(cache.get('k0')).toBe('[0]');
    expect(cache.get('new')).toBe('[x]');
  });
});
