import { askSearchNavigation } from './ask-search-navigation';

const BASE = { q: null, folderId: null, tags: [], kind: null, favorite: false };

describe('askSearchNavigation', () => {
  it('opens All links with the words, tags and kind', () => {
    expect(
      askSearchNavigation({ ...BASE, q: 'signals', tags: ['angular'], kind: 'video' }),
    ).toEqual({
      commands: ['/', 'links'],
      queryParams: { q: 'signals', tag: ['angular'], kind: 'video' },
    });
  });

  it('opens the folder or Favorites feed', () => {
    expect(askSearchNavigation({ ...BASE, folderId: 'f1' }).commands).toEqual([
      '/',
      'folders',
      'f1',
    ]);
    expect(askSearchNavigation({ ...BASE, favorite: true })).toEqual({
      commands: ['/', 'favorites'],
      queryParams: {},
    });
  });
});
