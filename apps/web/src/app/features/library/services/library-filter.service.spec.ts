import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LIBRARY_SORT } from '@shelfmark/contracts';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import type { LinksScope } from '../../links/models/links-scope.type';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { LibraryFilterService } from './library-filter.service';

function setup() {
  const router = { navigate: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
  const service = TestBed.inject(LibraryFilterService);
  const scope = signal<LinksScope>(LINKS_SCOPE.All);
  const folderId = signal<string | undefined>(undefined);
  const tag = signal<string | readonly string[] | undefined>(undefined);
  const q = signal<unknown>(undefined);
  const sort = signal<unknown>(undefined);
  const kind = signal<unknown>(undefined);
  service.connect({ scope, folderId, tag, q, sort, kind });
  return { service, router, scope, folderId, tag, q, sort, kind };
}

describe('LibraryFilterService', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('builds the filter from the scope and the query', () => {
    const { service, scope, tag, q, kind, sort } = setup();
    expect(service.filter()).toEqual({ scope: LINKS_SCOPE.All });
    expect(service.filtered()).toBe(false);

    tag.set(['b', 'a']);
    q.set('signal');
    kind.set('video');
    sort.set(LIBRARY_SORT.Oldest);
    scope.set(LINKS_SCOPE.Favorites);
    expect(service.filter()).toMatchObject({
      scope: LINKS_SCOPE.Favorites,
      q: 'signal',
      kind: 'video',
    });
    expect(service.filtered()).toBe(true);
    expect(service.searching()).toBe(true);
    expect(service.canAddLink()).toBe(false);
  });

  it('keys the feed by folder and names a folder page without an id as not found', () => {
    const { service, scope, folderId } = setup();
    expect(service.feedKey()).toBe(LINKS_SCOPE.All);

    scope.set(LINKS_SCOPE.Folder);
    expect(service.folderMissing()).toBe(true);
    expect(service.filter()).toEqual({ scope: LINKS_SCOPE.All });

    folderId.set('f1');
    expect(service.feedKey()).toBe('folder:f1');
    expect(service.filter()).toEqual({ scope: LINKS_SCOPE.Folder, folderId: 'f1' });
    expect(service.addLinkData()).toEqual({ folderId: 'f1' });
  });

  it('remembers the sort of a feed and leaves the default out of the URL', async () => {
    const { service, router } = setup();
    await service.setSort(LIBRARY_SORT.Title);
    expect(service.feedSort()).toBe(LIBRARY_SORT.Title);
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { sort: LIBRARY_SORT.Title },
      queryParamsHandling: 'merge',
    });

    await service.setSort(LIBRARY_SORT.Newest);
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { sort: null },
      queryParamsHandling: 'merge',
    });
  });

  it('takes tags, search and kind out of the URL', async () => {
    const { service, router, tag } = setup();
    tag.set(['a', 'b']);
    await service.removeTag('a');
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { tag: ['b'] },
      queryParamsHandling: 'merge',
    });

    await service.clearAll();
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { q: null, tag: null, kind: null },
      queryParamsHandling: 'merge',
    });

    await service.clearFilters();
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { tag: null, kind: null },
      queryParamsHandling: 'merge',
    });
  });
});
