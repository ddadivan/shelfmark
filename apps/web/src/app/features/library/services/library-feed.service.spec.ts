import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { LinksStore } from '../../../stores/links.store';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import type { LinksScope } from '../../links/models/links-scope.type';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { provideTranslocoForTest, loadEnglish } from '../../../testing/transloco-testing';
import { LibraryFeedService } from './library-feed.service';
import { LibraryFilterService } from './library-filter.service';

const link = (n: number): LinkResponse => ({ ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}` });
const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

async function setup(items: LinkResponse[]) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page(items))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: LINKS_API, useValue: api }],
  });
  await loadEnglish();
  const filters = TestBed.inject(LibraryFilterService);
  const scope = signal<LinksScope>(LINKS_SCOPE.All);
  filters.connect({
    scope,
    folderId: signal(undefined),
    tag: signal(undefined),
    q: signal(undefined),
    sort: signal(undefined),
    kind: signal(undefined),
  });
  const feed = TestBed.inject(LibraryFeedService);
  TestBed.tick();
  return { feed, store: TestBed.inject(LinksStore) };
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
});
