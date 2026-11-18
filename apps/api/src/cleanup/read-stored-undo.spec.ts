import { readStoredUndo } from './read-stored-undo';

const A = '0196a1b2-0000-7000-8000-000000000001';
const B = '0196a1b2-0000-7000-8000-000000000002';
const AT = '2026-11-18T10:00:00.000Z';

describe('readStoredUndo', () => {
  it.each([null, undefined, 'x', 3, [A], { deletedAt: 'yesterday' }, { deletedAt: 5 }])(
    'reads %j as nothing to undo',
    (value) => {
      expect(readStoredUndo(value)).toBeNull();
    },
  );

  it('keeps a well-formed value', () => {
    const value = {
      deletedAt: AT,
      trashedIds: [A, B],
      merges: [{ keptTagId: A, mergedName: 'Recipe', linkIds: [B], addedLinkIds: [] }],
    };
    expect(readStoredUndo(value)).toEqual(value);
  });

  it('drops malformed ids and merges one by one', () => {
    expect(
      readStoredUndo({
        deletedAt: null,
        trashedIds: [A, A, 'nope', 7],
        merges: [
          { keptTagId: 'nope', mergedName: 'x', linkIds: [], addedLinkIds: [] },
          { keptTagId: A, mergedName: '', linkIds: [], addedLinkIds: [] },
          { keptTagId: A, mergedName: 'x'.repeat(51), linkIds: [], addedLinkIds: [] },
          { keptTagId: A, mergedName: 3 },
          'junk',
          { keptTagId: B, mergedName: 'ok', linkIds: [A, 'bad'], addedLinkIds: 'bad' },
        ],
      }),
    ).toEqual({
      deletedAt: null,
      trashedIds: [A],
      merges: [{ keptTagId: B, mergedName: 'ok', linkIds: [A], addedLinkIds: [] }],
    });
  });

  it('reads missing lists as empty', () => {
    expect(readStoredUndo({ deletedAt: null })).toEqual({
      deletedAt: null,
      trashedIds: [],
      merges: [],
    });
  });
});
