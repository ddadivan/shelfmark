import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { NEVER, of } from 'rxjs';
import { READER_API } from '../reader/models/reader-api.const';
import { ViewportService } from '../../core/layout/viewport.service';
import { FoldersStore } from '../../stores/folders.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { FOLDERS_API } from '../links/models/folders-api.const';
import type { FoldersApi } from '../links/models/folders-api.interface';
import { LINKS_API } from '../links/models/links-api.const';
import type { LinksApi } from '../links/models/links-api.interface';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { LinkPreviewRoute } from '../link-preview/services/link-preview-route.service';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { FEED_MEMORY_STORAGE_KEY } from './models/feed-memory-storage-key.const';
import { LibraryFilterService } from './services/library-filter.service';
import LibraryPage from './library.page';

const link = (n: number): LinkResponse => ({
  ...MOCK_LINKS[0],
  id: `id-${n}`,
  title: `Link ${n}`,
  url: `https://site${n}.example.com/a`,
  isFavorite: false,
  folderId: null,
});

/** The link preview route as the page sees it: `split` is the desktop preview beside the feed. */
function routeStub() {
  const split = signal(false);
  return {
    split,
    currentId: signal<string | null>(null),
    isOpen: split,
    pushed: signal(false),
    open: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  };
}

async function setup(items: LinkResponse[] = [link(1), link(2), link(3)], kind?: string) {
  const route = routeStub();
  const linksApi = {
    list: vi.fn<LinksApi['list']>(() =>
      of({ items, nextCursor: null, pinned: [] } satisfies ListLinksResponse),
    ),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const foldersApi = {
    list: vi.fn<FoldersApi['list']>(() => of({ items: [], counts: MOCK_LIBRARY_COUNTS })),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: linksApi },
      { provide: FOLDERS_API, useValue: foldersApi },
      { provide: LinkPreviewRoute, useValue: route },
      {
        provide: READER_API,
        useValue: {
          article: () => NEVER,
          progress: () => of([]),
          saveProgress: () => of(undefined),
        },
      },
      {
        provide: ViewportService,
        useValue: {
          phone: signal(false),
          compact: signal(false),
          desktop: signal(true),
          wide: signal(true),
          huge: signal(false),
        },
      },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
    ],
  });
  await loadEnglish();
  await TestBed.inject(FoldersStore).load();
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', LINKS_SCOPE.All);
  if (kind !== undefined) {
    fixture.componentRef.setInput('kind', kind);
  }
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, route };
}

const buttons = (fixture: ComponentFixture<LibraryPage>, name: string) =>
  TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(UiButtonHarness.with({ name }));

const toolLabels = (element: HTMLElement) =>
  [...element.querySelectorAll('.library__tools button')].map(
    (button) => button.getAttribute('aria-label') ?? button.textContent?.trim(),
  );

describe('LibraryPage beside the link preview', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('shows the feed as Headlines while the preview is open, without changing the saved view', async () => {
    const { fixture, element, route } = await setup();
    const filters = fixture.debugElement.injector.get(LibraryFilterService);
    filters.rememberView(UI_VIEW.Cards, filters.feedKey());
    await fixture.whenStable();
    expect(element.querySelector('.library__grid')).not.toBeNull();
    expect(element.querySelector('.library__rows--headlines')).toBeNull();

    route.split.set(true);
    await fixture.whenStable();
    expect(element.querySelector('.library__rows--headlines')).not.toBeNull();
    expect(element.querySelector('.library__grid')).toBeNull();
    expect(filters.view()).toBe(UI_VIEW.Cards);

    route.split.set(false);
    await fixture.whenStable();
    expect(element.querySelector('.library__grid')).not.toBeNull();
  });

  it('slims the toolbar to Filter (icon only) and the menu, no Select, Save view, View or switch', async () => {
    const { fixture, element, route } = await setup();
    expect(toolLabels(element)).toEqual(
      expect.arrayContaining([
        'Filter',
        'Select links',
        'Save view',
        'Sort: Newest first',
        'Export this view…',
      ]),
    );
    expect(element.querySelector('ui-segmented-control')).not.toBeNull();

    route.split.set(true);
    await fixture.whenStable();
    // Sort and Export move into the ⋯ menu while split.
    expect(toolLabels(element)).toEqual(['Filter', 'More view options']);
    expect(element.querySelector('ui-segmented-control')).toBeNull();
    expect(element.querySelector('app-library-view-menu')).toBeNull();
    expect(await buttons(fixture, 'Side by side')).toHaveLength(0);
  });

  it('has no checkboxes, no Select button and ignores X while the preview is open', async () => {
    const { fixture, element, route } = await setup();
    route.split.set(true);
    await fixture.whenStable();
    expect(element.querySelector('.library__item ui-checkbox')).toBeNull();
    expect(await buttons(fixture, 'Select links')).toHaveLength(0);

    element
      .querySelector('.library__scroll')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true, cancelable: true }),
      );
    await fixture.whenStable();
    expect(element.querySelector('ui-bulk-bar')).toBeNull();
    expect(element.querySelector('.library__hint--select')).toBeNull();
  });

  it('ends a running selection when the preview opens and brings the checkboxes back on close', async () => {
    const { fixture, element, route } = await setup();
    const [select] = await buttons(fixture, 'Select links');
    await select.click();
    await fixture.whenStable();
    expect(element.querySelector('ui-bulk-bar')).not.toBeNull();

    route.split.set(true);
    await fixture.whenStable();
    expect(element.querySelector('ui-bulk-bar')).toBeNull();
    expect(element.querySelector('.library__item ui-checkbox')).toBeNull();

    route.split.set(false);
    await fixture.whenStable();
    expect(element.querySelector('.library__item ui-checkbox')).not.toBeNull();
    expect(await buttons(fixture, 'Select links')).toHaveLength(1);
  });

  it('marks the rows dense so only the ⋯ menu shows beside the title', async () => {
    const { fixture, element, route } = await setup();
    route.split.set(true);
    await fixture.whenStable();
    expect(element.querySelector('app-link-row.link-row--dense')).not.toBeNull();
  });
});

describe('LibraryPage with an empty result', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('keeps Filter, Save view, View and the view switch, and the empty state with Clear filters', async () => {
    const { fixture, element } = await setup([], 'video');
    expect(element.querySelector('ui-empty-state')?.textContent).toContain(
      'Nothing matches these filters',
    );
    const labels = toolLabels(element);
    expect(labels).toEqual(
      expect.arrayContaining(['Filter · 1', 'Sort: Newest first', 'Export this view…']),
    );
    expect(element.querySelector('ui-segmented-control')).not.toBeNull();
    expect(element.querySelector('app-library-view-menu')).not.toBeNull();
    // Nothing to act on: no Select, no Side by side.
    expect(await buttons(fixture, 'Select links')).toHaveLength(0);
    expect(await buttons(fixture, 'Side by side')).toHaveLength(0);
  });

  it('drops the view tools in a truly empty library', async () => {
    const { element } = await setup([]);
    expect(element.querySelector('ui-segmented-control')).toBeNull();
    // Nothing to filter or sort; Export stays.
    expect(toolLabels(element)).toEqual(['Export this view…']);
  });
});
