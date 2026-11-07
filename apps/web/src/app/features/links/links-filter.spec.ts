import { LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { MOCK_ID, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { inFilter, linksQuery, sameFilter } from './links-filter';
import { LINKS_SCOPE } from './models/links-scope.const';

const LINK = { ...MOCK_LINKS[0], folderId: null, isFavorite: false, tags: ['Docs', 'video'] };

describe('linksQuery', () => {
  it('is empty for the all scope', () => {
    expect(linksQuery({ scope: LINKS_SCOPE.All })).toEqual({});
  });

  it('maps the scopes', () => {
    expect(linksQuery({ scope: LINKS_SCOPE.Unsorted })).toEqual({ unsorted: true });
    expect(linksQuery({ scope: LINKS_SCOPE.Favorites })).toEqual({ favorite: true });
    expect(linksQuery({ scope: LINKS_SCOPE.Folder, folderId: MOCK_ID.FolderAngular })).toEqual({
      folderId: MOCK_ID.FolderAngular,
    });
  });

  it('adds tags, search, sort and the cursor, and leaves empty values out', () => {
    expect(
      linksQuery(
        {
          scope: LINKS_SCOPE.All,
          tags: ['a', 'b'],
          q: 'ng',
          sort: LINK_SORT_FIELD.Title,
          order: SORT_ORDER.Asc,
        },
        'next',
      ),
    ).toEqual({ cursor: 'next', tag: ['a', 'b'], q: 'ng', sort: 'title', order: 'asc' });
    expect(linksQuery({ scope: LINKS_SCOPE.All, tags: [], q: '' })).toEqual({});
  });
});

describe('inFilter', () => {
  it('checks the scope', () => {
    expect(inFilter({ scope: LINKS_SCOPE.Unsorted }, LINK)).toBe(true);
    expect(inFilter({ scope: LINKS_SCOPE.Favorites }, LINK)).toBe(false);
    expect(inFilter({ scope: LINKS_SCOPE.Folder, folderId: MOCK_ID.FolderAngular }, LINK)).toBe(
      false,
    );
    expect(
      inFilter(
        { scope: LINKS_SCOPE.Folder, folderId: MOCK_ID.FolderAngular },
        { ...LINK, folderId: MOCK_ID.FolderAngular },
      ),
    ).toBe(true);
  });

  it('needs every tag, case-insensitively, and the search in the title', () => {
    expect(inFilter({ scope: LINKS_SCOPE.All, tags: ['docs', 'VIDEO'] }, LINK)).toBe(true);
    expect(inFilter({ scope: LINKS_SCOPE.All, tags: ['docs', 'nope'] }, LINK)).toBe(false);
    expect(
      inFilter({ scope: LINKS_SCOPE.All, q: LINK.title.slice(0, 3).toUpperCase() }, LINK),
    ).toBe(true);
    expect(inFilter({ scope: LINKS_SCOPE.All, q: 'zzzz' }, LINK)).toBe(false);
  });
});

describe('sameFilter', () => {
  it('compares what is requested', () => {
    expect(sameFilter({ scope: LINKS_SCOPE.All }, { scope: LINKS_SCOPE.All, tags: [] })).toBe(true);
    expect(sameFilter({ scope: LINKS_SCOPE.All }, { scope: LINKS_SCOPE.Favorites })).toBe(false);
    expect(
      sameFilter(
        { scope: LINKS_SCOPE.Folder, folderId: 'a' },
        { scope: LINKS_SCOPE.Folder, folderId: 'b' },
      ),
    ).toBe(false);
  });
});
