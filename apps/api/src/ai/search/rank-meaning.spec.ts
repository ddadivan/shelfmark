import { rankMeaning } from './rank-meaning';

describe('rankMeaning', () => {
  it('keeps hits above the floor and within the window of the best, best first', () => {
    const hits = [
      { linkId: 'c', similarity: 0.56 },
      { linkId: 'a', similarity: 0.7 },
      { linkId: 'b', similarity: 0.6 },
      { linkId: 'd', similarity: 0.54 },
    ];
    expect(rankMeaning(hits, 0.3).map((hit) => hit.linkId)).toEqual(['a', 'b', 'c']);
  });

  it('drops everything under the provider floor and answers nothing for no hits', () => {
    expect(rankMeaning([{ linkId: 'a', similarity: 0.2 }], 0.35)).toEqual([]);
    expect(rankMeaning([], 0.35)).toEqual([]);
  });
});
