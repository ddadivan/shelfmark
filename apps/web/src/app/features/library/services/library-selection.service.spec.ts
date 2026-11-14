import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { LinkSelectionStore } from '../../../stores/link-selection.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { LibraryFilterService } from './library-filter.service';
import { LibrarySelectionService } from './library-selection.service';
import { provideLibraryPage } from './provide-library-page';

const link = (n: number): LinkResponse => ({ ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}` });
const page = (items: LinkResponse[]): ListLinksResponse => ({
  items,
  nextCursor: null,
  pinned: [],
});

async function setup() {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page([link(1), link(2), link(3), link(4)]))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const host = document.createElement('div');
  TestBed.configureTestingModule({
    providers: [
      ...provideLibraryPage(),
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: ElementRef, useValue: new ElementRef(host) },
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
  const selection = TestBed.inject(LibrarySelectionService);
  TestBed.tick();
  return { selection, host, store: TestBed.inject(LinkSelectionStore) };
}

describe('LibrarySelectionService', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('starts without a selection', async () => {
    const { selection } = await setup();
    expect(selection.order()).toEqual(['id-1', 'id-2', 'id-3', 'id-4']);
    expect(selection.selecting()).toBe(false);
    expect(selection.selectedCount()).toBe(0);
  });

  it('toggles single links and a Shift range from the anchor', async () => {
    const { selection } = await setup();
    selection.toggleSelected(link(2), { range: false });
    expect(selection.has('id-2')).toBe(true);
    expect(selection.anchor()).toBe('id-2');

    selection.toggleSelected(link(4), { range: true });
    expect(selection.selectedLinks().map((item) => item.id)).toEqual(['id-2', 'id-3', 'id-4']);
    expect(selection.allSelected()).toBe(false);

    selection.toggleSelected(link(3), { range: false });
    expect(selection.has('id-3')).toBe(false);
  });

  it('selects all, and the header box ends the mode when unchecked', async () => {
    const { selection } = await setup();
    selection.toggleAll(true);
    expect(selection.selectedCount()).toBe(4);
    expect(selection.allSelected()).toBe(true);

    selection.toggleAll(false);
    expect(selection.selecting()).toBe(false);
  });

  it('announces entering and leaving selection mode', async () => {
    const { selection } = await setup();
    expect(selection.modeAnnouncement()).toBe('');
    selection.selectAll();
    TestBed.tick();
    const on = selection.modeAnnouncement();
    expect(on).not.toBe('');

    selection.clear();
    TestBed.tick();
    expect(selection.modeAnnouncement()).not.toBe(on);

    selection.announce('moving');
    expect(selection.modeAnnouncement()).toBe('moving');
  });

  it('hands focus to the last picked link when the mode ends', async () => {
    const { selection, host } = await setup();
    for (const n of [1, 2]) {
      const item = document.createElement('li');
      item.className = 'library__item';
      item.dataset['linkId'] = `id-${n}`;
      const anchor = document.createElement('a');
      anchor.className = 'ui-card__link';
      anchor.href = '#';
      anchor.id = `a${n}`;
      item.append(anchor);
      host.append(item);
    }
    document.body.append(host);
    selection.toggleSelected(link(2), { range: false });
    selection.endSelection();
    expect(document.activeElement?.id).toBe('a2');
    expect(selection.selecting()).toBe(false);
    host.remove();
  });

  it('drops the selection when the page goes away', async () => {
    const { selection, store } = await setup();
    selection.selectAll();
    expect(store.count()).toBe(4);
    TestBed.resetTestingModule();
    expect(store.count()).toBe(0);
  });
});
