import { wouldCreateCycle } from './would-create-cycle';

const tree = [
  { id: 'a', parentId: null },
  { id: 'b', parentId: 'a' },
  { id: 'c', parentId: 'b' },
  { id: 'd', parentId: null },
];

describe('wouldCreateCycle', () => {
  it('allows a move to the top level', () => {
    expect(wouldCreateCycle('a', null, tree)).toBe(false);
  });

  it('rejects a move into itself', () => {
    expect(wouldCreateCycle('a', 'a', tree)).toBe(true);
  });

  it('rejects a move into a child and a deeper descendant', () => {
    expect(wouldCreateCycle('a', 'b', tree)).toBe(true);
    expect(wouldCreateCycle('a', 'c', tree)).toBe(true);
  });

  it('allows a move into an unrelated folder or an ancestor', () => {
    expect(wouldCreateCycle('a', 'd', tree)).toBe(false);
    expect(wouldCreateCycle('c', 'a', tree)).toBe(false);
  });

  it('stops on a loop that does not include the folder', () => {
    const corrupt = [
      { id: 'x', parentId: 'y' },
      { id: 'y', parentId: 'x' },
    ];
    expect(wouldCreateCycle('z', 'x', corrupt)).toBe(true);
  });
});
