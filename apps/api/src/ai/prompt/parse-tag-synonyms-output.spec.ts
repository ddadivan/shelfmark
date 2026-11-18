import { CLEANUP_LIMIT } from '@shelfmark/contracts';
import { parseTagSynonymsOutput } from './parse-tag-synonyms-output';

const keys = new Set(Array.from({ length: 60 }, (_, n) => `t${n + 1}`));

describe('parseTagSynonymsOutput', () => {
  it.each([null, 'x', [], {}, { pairs: 'x' }])('reads %j as no pairs', (output) => {
    expect(parseTagSynonymsOutput(output, keys)).toEqual([]);
  });

  it('keeps known, distinct keys and drops everything else', () => {
    expect(
      parseTagSynonymsOutput(
        {
          pairs: [
            { keep: 't1', merge: 't2' },
            { keep: 't3', merge: 't3' },
            { keep: 't4', merge: 'admin' },
            { keep: 'javascript', merge: 't5' },
            { keep: 't6', merge: 7 },
            'x',
            { keep: 't8', merge: 't9' },
          ],
        },
        keys,
      ),
    ).toEqual([
      { keep: 't1', merge: 't2' },
      { keep: 't8', merge: 't9' },
    ]);
  });

  it('allows each key in one pair only, so there are no chains', () => {
    expect(
      parseTagSynonymsOutput(
        {
          pairs: [
            { keep: 't1', merge: 't2' },
            { keep: 't2', merge: 't3' },
            { keep: 't4', merge: 't1' },
            { keep: 't1', merge: 't2' },
          ],
        },
        keys,
      ),
    ).toEqual([{ keep: 't1', merge: 't2' }]);
  });

  it('drops pairs the rule step found, in either order', () => {
    expect(
      parseTagSynonymsOutput(
        {
          pairs: [
            { keep: 't2', merge: 't1' },
            { keep: 't3', merge: 't4' },
          ],
        },
        keys,
        new Set(['t1|t2']),
      ),
    ).toEqual([{ keep: 't3', merge: 't4' }]);
  });

  it('caps the pairs', () => {
    const pairs = Array.from({ length: 30 }, (_, n) => ({
      keep: `t${n * 2 + 1}`,
      merge: `t${n * 2 + 2}`,
    }));
    expect(parseTagSynonymsOutput({ pairs }, keys)).toHaveLength(CLEANUP_LIMIT.TagPairsMax);
  });

  it('pairs only known keys even when told to merge every tag into admin', () => {
    const pairs = [...keys].map((key) => ({ keep: 'admin', merge: key }));
    expect(parseTagSynonymsOutput({ pairs }, keys)).toEqual([]);
  });
});
