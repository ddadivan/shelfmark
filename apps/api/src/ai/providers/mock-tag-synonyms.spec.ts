import { mockTagSynonyms } from './mock-tag-synonyms';

describe('mockTagSynonyms', () => {
  it('pairs the tags of a synonym set, the first present kept', () => {
    expect(
      mockTagSynonyms({
        tags: [
          { key: 't1', name: 'JS' },
          { key: 't2', name: 'cooking' },
          { key: 't3', name: 'JavaScript' },
          { key: 't4', name: 'recipes' },
          { key: 't5', name: 'travel' },
        ],
      }),
    ).toEqual({
      type: 'output',
      output: {
        pairs: [
          { keep: 't1', merge: 't3' },
          { keep: 't2', merge: 't4' },
        ],
      },
    });
  });

  it('answers no pairs without synonyms and honours the triggers', () => {
    expect(mockTagSynonyms({ tags: [{ key: 't1', name: 'travel' }] })).toEqual({
      type: 'output',
      output: { pairs: [] },
    });
    expect(mockTagSynonyms({ tags: [{ key: 't1', name: 'ai-fail' }] })).toEqual({
      type: 'error',
      retryable: true,
    });
    expect(mockTagSynonyms({ tags: [{ key: 't1', name: 'x ai-refuse' }] })).toEqual({
      type: 'refusal',
    });
  });
});
