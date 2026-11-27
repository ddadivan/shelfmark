import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type NavigationExtras, Router } from '@angular/router';
import { LIBRARY_SORT } from '@shelfmark/contracts';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import type { LinksScope } from '../../links/models/links-scope.type';
import { CARD_FIELD } from '../models/card-field.const';
import { GRID_COLUMNS } from '../models/grid-columns.const';
import { GRID_STEP_DEFAULT } from '../models/grid-step-default.const';
import { LibraryFilterService } from './library-filter.service';
import { provideLibraryPage } from './provide-library-page';

function setup() {
  const router = {
    navigate: vi.fn<(commands: readonly unknown[], extras?: NavigationExtras) => Promise<boolean>>(
      () => Promise.resolve(true),
    ),
  };
  TestBed.configureTestingModule({
    providers: [...provideLibraryPage(), { provide: Router, useValue: router }],
  });
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
  beforeEach(() => localStorage.removeItem(STORAGE_KEY.FeedMemory));
  afterAll(() => localStorage.removeItem(STORAGE_KEY.FeedMemory));

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

  it('keeps the same filter object for the same request, so ?split refetches nothing', () => {
    const { service, scope, tag } = setup();
    const split = signal<unknown>(undefined);
    service.connect({
      scope,
      folderId: signal(undefined),
      tag,
      q: signal(undefined),
      sort: signal(undefined),
      kind: signal(undefined),
      split,
    });
    const before = service.filter();
    expect(service.splitParam()).toBeUndefined();

    split.set('');
    expect(service.splitParam()).toBe('');
    // An input that recomputes the filter to the same request gives the same object.
    tag.set([]);
    expect(service.filter()).toBe(before);

    tag.set(['a']);
    expect(service.filter()).not.toBe(before);
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
      queryParams: { q: null, tag: null, kind: null, saved: null, fav: null },
      queryParamsHandling: 'merge',
    });

    await service.clearFilters();
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { tag: null, kind: null, saved: null, fav: null },
      queryParamsHandling: 'merge',
    });
  });

  describe('Filter popover (Shelf)', () => {
    function withFilterInputs() {
      const base = setup();
      const saved = signal<unknown>(undefined);
      const fav = signal<unknown>(undefined);
      base.service.connect({
        scope: base.scope,
        folderId: base.folderId,
        tag: base.tag,
        q: base.q,
        sort: base.sort,
        kind: base.kind,
        saved,
        fav,
      });
      return { ...base, saved, fav };
    }

    it('reads ?saved and ?fav into the filter and counts the settings that are on', () => {
      const { service, saved, fav, tag, kind, scope } = withFilterInputs();
      expect(service.filterCount()).toBe(0);
      saved.set('week');
      fav.set('1');
      tag.set(['a', 'b']);
      kind.set('video');
      expect(service.filter()).toMatchObject({ saved: 'week', favorite: true, kind: 'video' });
      expect(service.filtered()).toBe(true);
      expect(service.filterCount()).toBe(5);
      // On the Favorites feed "Only favorites" is the feed itself, not a filter.
      scope.set(LINKS_SCOPE.Favorites);
      expect(service.onlyFavorites()).toBe(true);
      expect(service.favoriteFilter()).toBe(false);
      expect(service.filter()).not.toHaveProperty('favorite');
      saved.set('year');
      expect(service.saved()).toBeUndefined();
    });

    it('toggles a kind and a tag, sets Saved and Only favorites in the URL', async () => {
      const { service, router, kind, tag } = withFilterInputs();
      const last = () => router.navigate.mock.lastCall?.[1]?.queryParams;
      await service.toggleKind('video');
      expect(last()).toEqual({ kind: 'video' });
      kind.set('video');
      await service.toggleKind('video');
      expect(last()).toEqual({ kind: null });
      tag.set(['a']);
      await service.toggleTag('B');
      expect(last()).toEqual({ tag: ['a', 'B'] });
      await service.toggleTag('A');
      expect(last()).toEqual({ tag: null });
      await service.setSaved('month');
      expect(last()).toEqual({ saved: 'month' });
      await service.setSaved(undefined);
      expect(last()).toEqual({ saved: null });
      await service.setOnlyFavorites(true);
      expect(last()).toEqual({ fav: '1' });
      await service.setOnlyFavorites(false);
      expect(last()).toEqual({ fav: null });
    });
  });

  describe('grid size and card fields (Shelf View menu)', () => {
    it('starts at the default step with every field shown', () => {
      const { service } = setup();
      expect(service.gridStep()).toBe(GRID_STEP_DEFAULT);
      expect(service.gridColumn()).toBe(GRID_COLUMNS[GRID_STEP_DEFAULT - 1]);
      expect(service.cardFields()).toEqual({});
      for (const field of Object.values(CARD_FIELD)) {
        expect(service.fieldShown(field)).toBe(true);
      }
    });

    it('sets the step and maps it to the column width', () => {
      const { service } = setup();
      service.setGridStep(1);
      expect(service.gridStep()).toBe(1);
      expect(service.gridColumn()).toBe(GRID_COLUMNS[0]);
      service.setGridStep(6);
      expect(service.gridColumn()).toBe(GRID_COLUMNS[5]);
    });

    it.each([
      [0, 1],
      [-5, 1],
      [99, 6],
      [2.6, 3],
    ])('clamps and rounds the step %s to %s', (step, expected) => {
      const { service } = setup();
      service.setGridStep(step);
      expect(service.gridStep()).toBe(expected);
    });

    it('turns one field off and on again without touching the others', () => {
      const { service } = setup();
      service.setCardField(CARD_FIELD.Note, false);
      expect(service.fieldShown(CARD_FIELD.Note)).toBe(false);
      expect(service.fieldShown(CARD_FIELD.Tags)).toBe(true);
      service.setCardField(CARD_FIELD.Date, false);
      expect(service.cardFields()).toEqual({ note: false, date: false });
      service.setCardField(CARD_FIELD.Note, true);
      expect(service.fieldShown(CARD_FIELD.Note)).toBe(true);
      expect(service.fieldShown(CARD_FIELD.Date)).toBe(false);
    });

    it('keeps the grid and fields of each feed apart', () => {
      const { service, scope, folderId } = setup();
      service.setGridStep(2);
      service.setCardField(CARD_FIELD.Tags, false);

      scope.set(LINKS_SCOPE.Folder);
      folderId.set('f1');
      expect(service.gridStep()).toBe(GRID_STEP_DEFAULT);
      expect(service.fieldShown(CARD_FIELD.Tags)).toBe(true);

      scope.set(LINKS_SCOPE.All);
      expect(service.gridStep()).toBe(2);
      expect(service.fieldShown(CARD_FIELD.Tags)).toBe(false);
    });
  });
});
