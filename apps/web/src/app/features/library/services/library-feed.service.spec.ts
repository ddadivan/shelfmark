import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, Subject } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import type { LinksScope } from '../../links/models/links-scope.type';
import { LAND_STAGGER_MS } from '../models/land-stagger-ms.const';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { provideTranslocoForTest, loadEnglish } from '../../../testing/transloco-testing';
import { LibraryFeedService } from './library-feed.service';
import { LibraryFilterService } from './library-filter.service';
import { provideLibraryPage } from './provide-library-page';

const link = (n: number): LinkResponse => ({ ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}` });
const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

async function setup(items: LinkResponse[], list?: LinksApi['list']) {
  const api = {
    list: vi.fn<LinksApi['list']>(list ?? (() => of(page(items)))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({
    providers: [
      ...provideLibraryPage(),
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
    ],
  });
  await loadEnglish();
  const filters = TestBed.inject(LibraryFilterService);
  const scope = signal<LinksScope>(LINKS_SCOPE.All);
  const tag = signal<string | undefined>(undefined);
  filters.connect({
    scope,
    folderId: signal(undefined),
    tag,
    q: signal(undefined),
    sort: signal(undefined),
    kind: signal(undefined),
  });
  const feed = TestBed.inject(LibraryFeedService);
  TestBed.tick();
  return { feed, store: TestBed.inject(LinksStore), tag };
}

describe('LibraryFeedService', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('shows the loaded links of the filter', async () => {
    const { feed } = await setup([link(1), link(2)]);
    expect(feed.shownLinks().map((item) => item.id)).toEqual(['id-1', 'id-2']);
    expect(feed.shownCount()).toBe(2);
    expect(feed.showLinks()).toBe(true);
    expect(feed.empty()).toBe(false);
    expect(feed.stale()).toBe(false);
    expect(feed.shownHasMore()).toBe(false);
  });

  it('is empty, and an empty library, when there is nothing at all', async () => {
    const { feed } = await setup([]);
    expect(feed.empty()).toBe(true);
    expect(feed.emptyLibrary()).toBe(true);
    expect(feed.showLinks()).toBe(false);
    expect(feed.shownCount()).toBe(0);
  });

  it('staggers the landing of a paste of many', async () => {
    const { feed } = await setup([link(1)]);
    expect(feed.landDelay('id-1')).toBeNull();
    expect(feed.landDelay('unknown')).toBeNull();
  });

  it('offers the cards / list switch once the translations are there', async () => {
    const { feed } = await setup([link(1)]);
    expect(feed.viewOptions()?.map((option) => option.value)).toEqual(['cards', 'list']);
  });

  it('keeps the old list on screen while the next filter loads, then swaps to the new one', async () => {
    const held = new Subject<ListLinksResponse>();
    let calls = 0;
    const { feed, tag } = await setup([], () => (calls++ === 0 ? of(page([link(1)])) : held));
    expect(feed.shownLinks().map((item) => item.id)).toEqual(['id-1']);
    const batch = feed.batch();

    tag.set('docs');
    TestBed.tick();

    expect(feed.stale()).toBe(true);
    expect(feed.refetching()).toBe(true);
    expect(feed.shownLinks().map((item) => item.id)).toEqual(['id-1']);
    expect(feed.firstLoad()).toBe(false);

    held.next(page([link(2), link(3)]));
    held.complete();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(feed.stale()).toBe(false);
    });
    expect(feed.shownLinks().map((item) => item.id)).toEqual(['id-2', 'id-3']);
    expect(feed.batch()).toBeGreaterThan(batch);
  });

  it('staggers the landing of links saved together, the first one lands at once', async () => {
    const { feed, store } = await setup([link(1)]);

    store.addSavedMany([link(10), link(11), link(12)]);

    expect(feed.landDelay('id-10')).toBeNull();
    expect(feed.landDelay('id-11')).toBe(`${LAND_STAGGER_MS}ms`);
    expect(feed.landDelay('id-12')).toBe(`${2 * LAND_STAGGER_MS}ms`);
  });
});
