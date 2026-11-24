import { describe, expect, it } from 'vitest';
import { readsLikeQuestion } from './reads-like-question';

describe('readsLikeQuestion', () => {
  it('takes a text ending in a question mark as a question', () => {
    expect(readsLikeQuestion('which angular video should I watch first?')).toBe(true);
    expect(readsLikeQuestion('jackets?')).toBe(true);
    expect(readsLikeQuestion('¿dónde está la receta')).toBe(true);
  });

  it('takes three or more words starting with a question word as a question', () => {
    expect(readsLikeQuestion('how many videos did I save')).toBe(true);
    expect(readsLikeQuestion('Wie viele Videos habe ich')).toBe(true);
    expect(readsLikeQuestion('скільки відео я зберіг')).toBe(true);
    expect(readsLikeQuestion('por que salvei isso')).toBe(true);
  });

  it('keeps plain searches and short phrases as searches', () => {
    expect(readsLikeQuestion('angular')).toBe(false);
    expect(readsLikeQuestion('how to')).toBe(false);
    expect(readsLikeQuestion('signal forms guide')).toBe(false);
    expect(readsLikeQuestion('   ')).toBe(false);
    expect(readsLikeQuestion('?')).toBe(false);
  });
});
