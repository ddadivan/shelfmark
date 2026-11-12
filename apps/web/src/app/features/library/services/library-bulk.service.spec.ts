import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { BULK_ACTION } from '../../links/models/bulk-action.const';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { BulkLinkActionsService } from '../../links/services/bulk-link-actions.service';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { LibraryBulkService } from './library-bulk.service';
import { LibraryFilterService } from './library-filter.service';
import { LibrarySelectionService } from './library-selection.service';

const link = (n: number): LinkResponse => ({
  ...MOCK_LINKS[0],
  id: `id-${n}`,
  title: `Link ${n}`,
  isFavorite: false,
});
const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

async function setup(deleted: boolean) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page([link(1), link(2)]))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const links = {
    canShare: () => false,
    move: vi.fn(() => Promise.resolve(false)),
    editTags: vi.fn(() => Promise.resolve(false)),
    toggleFavorite: vi.fn(() => Promise.resolve(false)),
    openAll: vi.fn(() => Promise.resolve(false)),
    copy: vi.fn(() => Promise.resolve(false)),
    share: vi.fn(() => Promise.resolve(false)),
    delete: vi.fn(() => Promise.resolve(deleted)),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: BulkLinkActionsService, useValue: links },
      { provide: ElementRef, useValue: new ElementRef(document.createElement('div')) },
    ],
  });
  await loadEnglish();
  TestBed.inject(LibraryFilterService).connect({
    scope: signal(LINKS_SCOPE.All),
    folderId: signal(undefined),
    tag: signal(undefined),
    q: signal(undefined),
    sort: signal(undefined),
    kind: signal(undefined),
  });
  const bulk = TestBed.inject(LibraryBulkService);
  const selection = TestBed.inject(LibrarySelectionService);
  TestBed.tick();
  return { bulk, selection, links };
}

describe('LibraryBulkService', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('offers move, tags, favorite, copy and delete', async () => {
    const { bulk } = await setup(true);
    const ids = bulk.barActions().map((action) => action.id);
    expect(ids).toEqual(expect.arrayContaining([BULK_ACTION.Move, BULK_ACTION.Tags]));
    expect(ids).toEqual(expect.arrayContaining([BULK_ACTION.Copy, BULK_ACTION.Delete]));
    expect(bulk.barActions().find((action) => action.id === BULK_ACTION.Favorite)?.pressed).toBe(
      false,
    );
  });

  it('runs an action on the picked links and ends the selection when it says so', async () => {
    const { bulk, selection, links } = await setup(true);
    selection.selectAll();
    await bulk.run(BULK_ACTION.Delete);
    expect(links.delete).toHaveBeenCalledWith(
      selection.order().map((id) => expect.objectContaining({ id })),
    );
    expect(selection.selecting()).toBe(false);
  });

  it('keeps the selection when the action does not ask to clear it', async () => {
    const { bulk, selection, links } = await setup(false);
    selection.selectAll();
    await bulk.run(BULK_ACTION.Move);
    expect(links.move).toHaveBeenCalledOnce();
    expect(selection.selecting()).toBe(true);
  });
});
