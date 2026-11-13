import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of } from 'rxjs';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { LinkDragService } from '../../links/services/link-drag.service';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';
import { LibraryDragService } from './library-drag.service';
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
    list: vi.fn<LinksApi['list']>(() => of(page([link(1), link(2), link(3)]))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const links = { start: vi.fn(), drop: vi.fn(), move: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      ...provideLibraryPage(),
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: LinkDragService, useValue: links },
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
  const dnd = TestBed.inject(LibraryDragService);
  const selection = TestBed.inject(LibrarySelectionService);
  TestBed.tick();
  return { dnd, selection, links };
}

describe('LibraryDragService', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('carries one link unless a picked link is dragged with others picked', async () => {
    const { dnd, selection } = await setup();
    expect(dnd.deckDepth(link(1))).toBe(0);
    expect(dnd.bundled(link(1))).toBe(false);
    expect(dnd.dragCount(link(1))).toBe(1);

    selection.toggleSelected(link(1), { range: false });
    expect(dnd.bundled(link(1))).toBe(false);

    selection.toggleSelected(link(2), { range: false });
    expect(dnd.bundled(link(2))).toBe(true);
    expect(dnd.bundled(link(3))).toBe(false);
    expect(dnd.dragCount(link(2))).toBe(2);
    expect(dnd.dragCount(link(3))).toBe(1);
    // The deck behind the preview: none for one link, one behind for two, two for three or more.
    expect(dnd.deckDepth(link(3))).toBe(0);
    expect(dnd.deckDepth(link(2))).toBe(1);

    selection.toggleSelected(link(3), { range: false });
    expect(dnd.deckDepth(link(3))).toBe(2);
    selection.toggleSelected(link(4), { range: false });
    expect(dnd.deckDepth(link(4))).toBe(2);
  });

  it('starts the drag with the picked links, says what moves and clears it at the end', async () => {
    const { dnd, selection, links } = await setup();
    selection.toggleSelected(link(1), { range: false });
    selection.toggleSelected(link(2), { range: false });

    dnd.started(link(2));
    expect(links.start).toHaveBeenCalledWith(
      link(2),
      expect.arrayContaining([expect.objectContaining({ id: 'id-1' })]),
    );
    expect(selection.modeAnnouncement()).not.toBe('');

    dnd.ended();
    expect(selection.modeAnnouncement()).toBe('');
    expect(links.drop).toHaveBeenCalledOnce();
  });

  it('hit-tests the folders under the pointer', async () => {
    const { dnd, links } = await setup();
    dnd.moved({ pointerPosition: { x: 12, y: 34 } } as Parameters<LibraryDragService['moved']>[0]);
    expect(links.move).toHaveBeenCalledWith(12, 34);
  });
});
