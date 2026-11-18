import { emptyFindings, readStoredFindings } from './read-stored-findings';

const A = '0196a1b2-0000-7000-8000-000000000001';
const B = '0196a1b2-0000-7000-8000-000000000002';
const C = '0196a1b2-0000-7000-8000-000000000003';

describe('readStoredFindings', () => {
  it.each([null, 'x', 3, [1, 2], undefined])('reads %j as empty findings', (value) => {
    expect(readStoredFindings(value)).toEqual(emptyFindings());
  });

  it('keeps well-formed items', () => {
    const value = {
      duplicates: [{ id: 'g1', reason: 'same-address', source: 'rule', linkIds: [A, B] }],
      similarTags: [{ id: 'p1', source: 'ai', tagIds: [A, C] }],
      pending: ['near-duplicates', 'tag-synonyms'],
      nearPairs: [[A, B]],
    };
    expect(readStoredFindings(value)).toEqual(value);
  });

  it('drops malformed items one by one', () => {
    const findings = readStoredFindings({
      duplicates: [
        { id: 'g1', reason: 'same-address', source: 'rule', linkIds: [A] },
        { id: 'bad id!', reason: 'same-address', source: 'rule', linkIds: [A, B] },
        { id: 'g3', reason: 'other', source: 'rule', linkIds: [A, B] },
        { id: 'g4', reason: 'same-page', source: 'robot', linkIds: [A, B] },
        { id: 'g5', reason: 'same-page', source: 'ai', linkIds: [A, 'nope'] },
        { id: 'g6', reason: 'same-page', source: 'ai', linkIds: [A, A, B] },
        'x',
      ],
      similarTags: [
        { id: 'p1', source: 'rule', tagIds: [A, A] },
        { id: 'p2', source: 'rule', tagIds: [A] },
        { id: 'p3', source: 'rule', tagIds: [A, 'x'] },
        { id: 'p4', source: 'rule', tagIds: 'x' },
        { id: 'p5', source: 'rule', tagIds: [B, C] },
      ],
      pending: ['near-duplicates', 'unknown', 'near-duplicates', 4],
      nearPairs: [[A, A], [A], [A, B, C], 'x', [B, C]],
    });
    expect(findings).toEqual({
      duplicates: [{ id: 'g6', reason: 'same-page', source: 'ai', linkIds: [A, B] }],
      similarTags: [{ id: 'p5', source: 'rule', tagIds: [B, C] }],
      pending: ['near-duplicates'],
      nearPairs: [[B, C]],
    });
  });

  it('reads missing lists as empty', () => {
    expect(readStoredFindings({ duplicates: 'x' })).toEqual(emptyFindings());
  });
});
