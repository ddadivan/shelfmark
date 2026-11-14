import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID, MOCK_TAGS } from '@shelfmark/contracts/testing';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { leftFeedId, leftFeedLabel, leftFeedOptions, leftFeedRoute } from './left-feed-options';

const MAP: Record<string, FolderResponse | undefined> = Object.fromEntries(
  MOCK_FOLDERS.map((folder) => [folder.id, folder]),
);
const translate = (key: string, params?: Record<string, string>): string =>
  params ? `${key}|${JSON.stringify(params)}` : key;

describe('leftFeedOptions', () => {
  const options = leftFeedOptions(
    MOCK_FOLDERS,
    MOCK_TAGS,
    { all: 'All links', unsorted: 'Unsorted', favorites: 'Favorites' },
    (colour) => colour,
  );

  it('starts with All links, Unsorted and Favorites, in that order', () => {
    expect(options.slice(0, 3)).toEqual([
      { id: 'scope:all', name: 'All links', icon: 'link' },
      { id: 'scope:unsorted', name: 'Unsorted', icon: 'inbox' },
      { id: 'scope:favorites', name: 'Favorites', icon: 'star' },
    ]);
  });

  it('continues with the folder tree and ends with the tags', () => {
    const folder = options[3];
    expect(folder.id).toBe(MOCK_ID.FolderReading);
    expect(folder.children?.map((child) => child.id)).toEqual([MOCK_ID.FolderAngular]);
    const tags = options.slice(4);
    expect(tags).toHaveLength(MOCK_TAGS.length);
    expect(tags[0]).toEqual({
      id: `tag:${MOCK_TAGS[0].name}`,
      name: MOCK_TAGS[0].name,
      icon: 'tag',
    });
  });

  it('keeps that order whatever the left half shows', () => {
    expect(options.map((option) => option.id).slice(0, 3)).toEqual([
      'scope:all',
      'scope:unsorted',
      'scope:favorites',
    ]);
  });
});

describe('leftFeedId', () => {
  it('names the option a filter shows', () => {
    expect(leftFeedId({ scope: LINKS_SCOPE.All })).toBe('scope:all');
    expect(leftFeedId({ scope: LINKS_SCOPE.Favorites })).toBe('scope:favorites');
    expect(leftFeedId({ scope: LINKS_SCOPE.Unsorted })).toBe('scope:unsorted');
    expect(leftFeedId({ scope: LINKS_SCOPE.Folder, folderId: 'f' })).toBe('f');
    expect(leftFeedId({ scope: LINKS_SCOPE.All, tags: ['a'] })).toBe('tag:a');
  });

  it('is All links for several tags or a search', () => {
    expect(leftFeedId({ scope: LINKS_SCOPE.All, tags: ['a', 'b'] })).toBe('scope:all');
    expect(leftFeedId({ scope: LINKS_SCOPE.All, tags: ['a'], q: 'x' })).toBe('scope:all');
  });
});

describe('leftFeedRoute', () => {
  it('opens the page of an option', () => {
    expect(leftFeedRoute('scope:unsorted')).toEqual({
      commands: ['/', 'unsorted'],
      queryParams: {},
    });
    expect(leftFeedRoute('scope:all')).toEqual({ commands: ['/', 'links'], queryParams: {} });
    expect(leftFeedRoute('scope:favorites')).toEqual({
      commands: ['/', 'favorites'],
      queryParams: {},
    });
    expect(leftFeedRoute('abc')).toEqual({ commands: ['/', 'folders', 'abc'], queryParams: {} });
  });

  it('opens all links filtered by the tag', () => {
    expect(leftFeedRoute('tag:docs')).toEqual({
      commands: ['/', 'links'],
      queryParams: { tag: 'docs' },
    });
  });
});

describe('leftFeedLabel', () => {
  const label = (filter: LinksFilter) => leftFeedLabel(filter, MAP, translate);

  it('is the folder name, empty while the folder is unknown', () => {
    expect(label({ scope: LINKS_SCOPE.Folder, folderId: MOCK_ID.FolderReading })).toBe(
      MOCK_FOLDERS[0].name,
    );
    expect(label({ scope: LINKS_SCOPE.Folder, folderId: 'nope' })).toBe('');
  });

  it('is the title key of a list', () => {
    expect(label({ scope: LINKS_SCOPE.All })).toBe('library.scope.all');
    expect(label({ scope: LINKS_SCOPE.Unsorted })).toBe('library.scope.unsorted');
    expect(label({ scope: LINKS_SCOPE.Favorites })).toBe('library.scope.favorites');
  });

  it('is #tag for tags on all links', () => {
    expect(label({ scope: LINKS_SCOPE.All, tags: ['a', 'b'] })).toBe('#a #b');
  });

  it('is the search label for a search, whatever else is set', () => {
    expect(label({ scope: LINKS_SCOPE.All, q: 'wool', tags: ['a'] })).toBe(
      'library.split.searchName|{"query":"wool"}',
    );
  });
});
