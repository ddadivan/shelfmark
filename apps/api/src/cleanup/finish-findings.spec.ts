import { CLEANUP_LIMIT } from '@shelfmark/contracts';
import { finishFindings } from './finish-findings';

const id = (n: number) => `0196a1b2-0000-7000-8000-${String(n).padStart(12, '0')}`;

describe('finishFindings', () => {
  it('turns pairs into same-page groups without links of exact groups', () => {
    const exact = {
      id: 'g1',
      reason: 'same-address',
      source: 'rule',
      linkIds: [id(1), id(2)],
    } as const;
    const done = finishFindings({
      duplicates: [{ ...exact, linkIds: [...exact.linkIds] }],
      similarTags: [],
      pending: ['near-duplicates'],
      nearPairs: [
        [id(1), id(3)],
        [id(4), id(5)],
      ],
    });
    expect(done.pending).toEqual([]);
    expect(done.nearPairs).toEqual([]);
    expect(done.duplicates).toHaveLength(2);
    expect(done.duplicates[1]).toMatchObject({
      reason: 'same-page',
      source: 'ai',
      linkIds: [id(4), id(5)],
    });
  });

  it('caps the groups in all', () => {
    const duplicates = Array.from({ length: CLEANUP_LIMIT.DuplicateGroupsMax }, (_, n) => ({
      id: `g${n}`,
      reason: 'same-address' as const,
      source: 'rule' as const,
      linkIds: [id(1000 + n * 2), id(1001 + n * 2)],
    }));
    const done = finishFindings({
      duplicates,
      similarTags: [],
      pending: [],
      nearPairs: [[id(1), id(2)]],
    });
    expect(done.duplicates).toHaveLength(CLEANUP_LIMIT.DuplicateGroupsMax);
  });
});
