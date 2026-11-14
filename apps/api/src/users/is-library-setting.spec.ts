import {
  isLibrarySort,
  isLibraryView,
  isLinkOpenTarget,
  LIBRARY_SORT,
  LIBRARY_VIEW,
  LINK_OPEN_TARGET,
} from '@shelfmark/contracts';

describe('library setting guards', () => {
  it.each(Object.values(LIBRARY_VIEW))('accepts the view %s', (value) => {
    expect(isLibraryView(value)).toBe(true);
  });

  it.each(Object.values(LIBRARY_SORT))('accepts the sort %s', (value) => {
    expect(isLibrarySort(value)).toBe(true);
  });

  it.each(Object.values(LINK_OPEN_TARGET))('accepts the open target %s', (value) => {
    expect(isLinkOpenTarget(value)).toBe(true);
  });

  it.each([['grid'], [''], [null], [undefined], [1], [['cards']], ['Cards']])(
    'rejects %j',
    (value) => {
      expect(isLibraryView(value)).toBe(false);
      expect(isLibrarySort(value)).toBe(false);
      expect(isLinkOpenTarget(value)).toBe(false);
    },
  );
});
