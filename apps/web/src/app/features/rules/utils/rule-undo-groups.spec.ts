import { ruleUndoGroups } from './rule-undo-groups';

describe('ruleUndoGroups', () => {
  it('groups the links by the rule tags they did not have, ignoring case', () => {
    expect(
      ruleUndoGroups(
        [
          { id: 'a', tags: [] },
          { id: 'b', tags: ['Video'] },
          { id: 'c', tags: ['fun'] },
          { id: 'd', tags: ['video', 'clip'] },
        ],
        ['video', 'clip'],
      ),
    ).toEqual([
      { ids: ['a', 'c'], removeTags: ['video', 'clip'] },
      { ids: ['b'], removeTags: ['clip'] },
      { ids: ['d'], removeTags: [] },
    ]);
  });

  it('is empty without matches', () => {
    expect(ruleUndoGroups([], ['video'])).toEqual([]);
  });
});
