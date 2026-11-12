import {
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type SavedViewQueryRequest,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import {
  activeViewOf,
  feedAllNavigation,
  feedQueryOf,
  savedQueryOf,
  viewNavigationOnFeed,
  viewOnFeed,
} from './feed-views';

function view(id: string, query: Partial<SavedViewResponse['query']>): SavedViewResponse {
  return {
    id,
    name: id,
    position: 0,
    count: 0,
    available: true,
    query: {
      scope: SAVED_VIEW_SCOPE.All,
      folderId: null,
      tags: [],
      kind: null,
      sort: LINK_SORT_FIELD.CreatedAt,
      order: SORT_ORDER.Desc,
      q: '',
      ...query,
    },
  };
}

const VIDEOS = view('videos', { kind: LINK_KIND.Video });
const DOCS = view('docs', { tags: ['docs'] });
const FAVS = view('favs', { scope: SAVED_VIEW_SCOPE.Favorites });
const VIEWS = [VIDEOS, DOCS, FAVS];
const FOLDER = { scope: LINKS_SCOPE.Folder, folderId: 'f1' } as const;

describe('feed views', () => {
  it('offers plain views everywhere and views tied to a place on All links and there', () => {
    expect(viewOnFeed(VIDEOS, FOLDER)).toBe(true);
    expect(viewOnFeed(FAVS, FOLDER)).toBe(false);
    expect(viewOnFeed(FAVS, { scope: LINKS_SCOPE.All })).toBe(true);
    expect(viewOnFeed(FAVS, { scope: LINKS_SCOPE.Favorites })).toBe(true);
  });

  it('counts in the feed: none for plain All links, scope, folder and unowned tags otherwise', () => {
    expect(feedQueryOf({ scope: LINKS_SCOPE.All }, VIEWS)).toBeUndefined();
    expect(feedQueryOf(FOLDER, VIEWS)).toEqual({ scope: 'folder', folderId: 'f1' });
    expect(feedQueryOf({ scope: LINKS_SCOPE.Unsorted }, VIEWS)).toEqual({ scope: 'unsorted' });
    expect(feedQueryOf({ scope: LINKS_SCOPE.All, tags: ['x'] }, VIEWS)).toEqual({
      scope: 'all',
      tag: ['x'],
    });
    // The tag belongs to the Docs view, not to the feed.
    expect(feedQueryOf({ scope: LINKS_SCOPE.All, tags: ['Docs'] }, VIEWS)).toBeUndefined();
  });

  it('finds the active view inside a feed', () => {
    expect(activeViewOf({ ...FOLDER, kind: LINK_KIND.Video }, VIEWS)?.id).toBe('videos');
    expect(activeViewOf(FOLDER, VIEWS)).toBeNull();
    expect(activeViewOf({ scope: LINKS_SCOPE.All, tags: ['docs', 'x'] }, VIEWS)?.id).toBe('docs');
  });

  it('navigates inside the feed, keeping its tags', () => {
    expect(viewNavigationOnFeed(VIDEOS, FOLDER, VIEWS)).toEqual({
      commands: ['/', 'folders', 'f1'],
      queryParams: { kind: 'video' },
    });
    expect(
      viewNavigationOnFeed(VIDEOS, { scope: LINKS_SCOPE.Unsorted, tags: ['x'] }, VIEWS),
    ).toEqual({ commands: ['/', 'unsorted'], queryParams: { tag: ['x'], kind: 'video' } });
    expect(viewNavigationOnFeed(FAVS, { scope: LINKS_SCOPE.All }, VIEWS).commands).toEqual([
      '/',
      'favorites',
    ]);
    expect(feedAllNavigation({ ...FOLDER, kind: LINK_KIND.Video, q: 'a' }, VIEWS)).toEqual({
      commands: ['/', 'folders', 'f1'],
      queryParams: {},
    });
  });

  it('saves the whole filter on All links and only the type on another feed', () => {
    const whole: SavedViewQueryRequest = { scope: SAVED_VIEW_SCOPE.All, tags: ['x'], q: 'a' };
    expect(savedQueryOf({ scope: LINKS_SCOPE.All }, whole)).toBe(whole);
    expect(savedQueryOf({ ...FOLDER, kind: LINK_KIND.Video, tags: ['x'] }, whole)).toEqual({
      scope: 'all',
      kind: 'video',
    });
  });
});
