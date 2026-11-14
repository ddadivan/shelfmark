import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Router } from '@angular/router';
import type { FolderResponse, LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { UiButtonHarness, UiPickerMenuHarness } from '@shelfmark/ui/testing';
import axe from 'axe-core';
import { of } from 'rxjs';
import { ViewportService } from '../../core/layout/viewport.service';
import { FoldersStore } from '../../stores/folders.store';
import { FOLDERS_API } from '../links/models/folders-api.const';
import type { FoldersApi } from '../links/models/folders-api.interface';
import { LINKS_API } from '../links/models/links-api.const';
import type { LinksApi } from '../links/models/links-api.interface';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { LibrarySelectionService } from './services/library-selection.service';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { FEED_MEMORY_STORAGE_KEY } from './models/feed-memory-storage-key.const';
import LibraryPage from './library.page';

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b2';

function folder(id: string, name: string): FolderResponse {
  return {
    id,
    parentId: null,
    name,
    colour: 'graphite',
    icon: 'folder',
    position: 0,
    pinned: false,
    linkCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function link(n: number, folderId: string | null): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    url: `https://site${n}.example.com/a`,
    isFavorite: false,
    folderId,
  };
}

async function setup({
  wide = true,
  split,
  scope = LINKS_SCOPE.Unsorted,
  extra = {},
}: {
  wide?: boolean;
  split?: string;
  scope?: LinksScope;
  extra?: Record<string, unknown>;
} = {}) {
  const linksApi = {
    list: vi.fn<LinksApi['list']>((query) =>
      of({
        items: query?.folderId === B ? [link(5, B), link(6, B)] : [link(1, null), link(2, null)],
        nextCursor: null,
        pinned: [],
      } satisfies ListLinksResponse),
    ),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  const foldersApi = {
    list: vi.fn<FoldersApi['list']>(() =>
      of({ items: [folder(A, 'Reading'), folder(B, 'Clothes')], counts: MOCK_LIBRARY_COUNTS }),
    ),
  };
  const viewport = {
    phone: signal(false),
    compact: signal(false),
    desktop: signal(true),
    wide: signal(wide),
    huge: signal(false),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: linksApi },
      { provide: FOLDERS_API, useValue: foldersApi },
      { provide: ViewportService, useValue: viewport },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
    ],
  });
  await loadEnglish();
  await TestBed.inject(FoldersStore).load();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', scope);
  fixture.componentRef.setInput('split', split);
  for (const [name, value] of Object.entries(extra)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, navigate, linksApi, viewport };
}

const loader = (fixture: ComponentFixture<LibraryPage>) =>
  TestbedHarnessEnvironment.loader(fixture);

describe('LibraryPage side by side', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('has one feed and a "Side by side" button without ?split, from 80em', async () => {
    const { element, fixture } = await setup();

    expect(element.querySelector('app-split-right-half')).toBeNull();
    expect(element.querySelector('ui-picker-menu')).toBeNull();
    const button = await loader(fixture).getHarness(
      UiButtonHarness.with({ label: /Side by side/ }),
    );
    expect(button).toBeTruthy();
  });

  it('has no "Side by side" button and ignores ?split below 80em', async () => {
    const { element, fixture } = await setup({ wide: false, split: B });

    expect(element.querySelector('app-split-right-half')).toBeNull();
    expect(
      await loader(fixture).getAllHarnesses(UiButtonHarness.with({ label: /Side by side/ })),
    ).toHaveLength(0);
  });

  it('opens the right half with the picker', async () => {
    const { fixture, navigate } = await setup();
    const button = await loader(fixture).getHarness(
      UiButtonHarness.with({ label: /Side by side/ }),
    );

    await button.click();

    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { split: '' },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
  });

  it('shows the picker in the right half for an empty ?split', async () => {
    const { element } = await setup({ split: '' });

    const right = element.querySelector('app-split-right-half section');
    expect(right?.getAttribute('aria-label')).toBe('Right: choose a folder');
    expect(right?.hasAttribute('data-link-drop-folder')).toBe(false);
    expect(right?.textContent).toContain('Choose a folder to move links into');
    expect(element.querySelector('app-split-right-half ui-picker-list')).not.toBeNull();
    expect(element.querySelector('h1')?.textContent).toBe('Unsorted');
  });

  it('shows the left picker menu, a hidden title and the drop values of both halves', async () => {
    const { element, fixture } = await setup({ split: B });

    expect(element.querySelector('.library__title--hidden')?.textContent).toBe('Unsorted');
    const menu = await loader(fixture).getAllHarnesses(UiPickerMenuHarness);
    expect(menu).toHaveLength(2);
    expect(await menu[0].getTriggerLabel()).toBe('Unsorted');
    expect(await menu[1].getTriggerLabel()).toBe('Clothes');
    const triggers = [...element.querySelectorAll('ui-picker-menu button')];
    expect(triggers.map((trigger) => trigger.getAttribute('aria-label'))).toEqual([
      'Left feed: Unsorted. Change',
      'Right folder: Clothes. Change',
    ]);
    expect(element.querySelector('.library__half')?.getAttribute('data-link-drop-folder')).toBe(
      'unsorted',
    );
    expect(
      element.querySelector('app-split-right-half section')?.getAttribute('data-link-drop-folder'),
    ).toBe(B);
  });

  it('lists the links of the right folder as read-only cards', async () => {
    const { element, linksApi } = await setup({ split: B });

    expect(linksApi.list).toHaveBeenCalledWith({ folderId: B });
    const right = element.querySelector('app-split-right-half') as HTMLElement;
    expect(right.querySelectorAll('app-link-card')).toHaveLength(2);
    expect(right.querySelector('input[type="checkbox"]')).toBeNull();
    expect(right.querySelector('li.library__item')).toBeNull();
    expect(right.textContent).toContain('2 links');
  });

  it('offers Swap sides only for a folder or Unsorted on the left and a target on the right', async () => {
    const { fixture } = await setup({ split: B });
    expect(
      await loader(fixture).getAllHarnesses(UiButtonHarness.with({ label: 'Swap sides' })),
    ).toHaveLength(1);
  });

  it('has no Swap button while the right half shows the picker', async () => {
    const { fixture } = await setup({ split: '' });
    expect(
      await loader(fixture).getAllHarnesses(UiButtonHarness.with({ label: 'Swap sides' })),
    ).toHaveLength(0);
  });

  it('shows the picker for a foreign folder id and does not rewrite the URL', async () => {
    const { element, navigate } = await setup({ split: '00000000-0000-4000-8000-0000000000ff' });

    expect(element.querySelector('app-split-right-half ui-picker-list')).not.toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('swaps the halves on a click: the right folder becomes the left route, the old left the split', async () => {
    const { fixture, navigate } = await setup({ split: B });
    const swap = await loader(fixture).getHarness(UiButtonHarness.with({ label: 'Swap sides' }));

    await swap.click();

    expect(navigate).toHaveBeenCalledWith(['/', 'folders', B], {
      queryParams: { split: 'unsorted' },
    });
  });

  it('has no Swap button while the left half shows Favorites', async () => {
    const { fixture, element } = await setup({ split: B, scope: LINKS_SCOPE.Favorites });

    expect(
      await loader(fixture).getAllHarnesses(UiButtonHarness.with({ label: 'Swap sides' })),
    ).toHaveLength(0);
    expect(element.querySelector('app-split-right-half ui-picker-list')).toBeNull();
  });

  it('has no Swap button while the left half shows a tag', async () => {
    const { fixture } = await setup({
      split: B,
      scope: LINKS_SCOPE.All,
      extra: { tag: 'angular' },
    });

    expect(
      await loader(fixture).getAllHarnesses(UiButtonHarness.with({ label: 'Swap sides' })),
    ).toHaveLength(0);
  });

  it('has no Swap button while the left half shows search results', async () => {
    const { fixture } = await setup({ split: B, scope: LINKS_SCOPE.All, extra: { q: 'pasta' } });

    expect(
      await loader(fixture).getAllHarnesses(UiButtonHarness.with({ label: 'Swap sides' })),
    ).toHaveLength(0);
  });

  it('falls back to the picker for the folder the left half already shows', async () => {
    const { element } = await setup({
      split: B,
      scope: LINKS_SCOPE.Folder,
      extra: { folderId: B },
    });

    expect(element.querySelector('app-split-right-half ui-picker-list')).not.toBeNull();
  });

  it('falls back to the picker for an unknown value', async () => {
    const { element } = await setup({ split: 'not-a-folder' });

    expect(element.querySelector('app-split-right-half ui-picker-list')).not.toBeNull();
  });

  describe('bulk bar', () => {
    const bulkLabels = (element: HTMLElement): string[] =>
      [...element.querySelectorAll('ui-bulk-bar button')].map((button) =>
        (button.textContent ?? '').trim(),
      );

    async function select(fixture: ComponentFixture<LibraryPage>): Promise<void> {
      fixture.debugElement.injector.get(LibrarySelectionService).selectAll();
      await fixture.whenStable();
    }

    it('starts with "Move to <right folder>" while a folder is open on the right', async () => {
      const { fixture, element } = await setup({ split: B });
      await select(fixture);

      expect(bulkLabels(element)[0]).toBe('Move to Clothes');
      expect(bulkLabels(element)).toContain('Move');
    });

    it('has no "Move to" action while the right half still shows the picker', async () => {
      const { fixture, element } = await setup({ split: '' });
      await select(fixture);

      expect(bulkLabels(element).length).toBeGreaterThan(0);
      expect(bulkLabels(element).some((label) => label.startsWith('Move to'))).toBe(false);
    });

    it('has no "Move to" action when side by side is closed', async () => {
      const { fixture, element } = await setup();
      await select(fixture);

      expect(bulkLabels(element).some((label) => label.startsWith('Move to'))).toBe(false);
    });

    it('has no "Move to" action below 80em even with ?split', async () => {
      const { fixture, element } = await setup({ wide: false, split: B });
      await select(fixture);

      expect(bulkLabels(element).some((label) => label.startsWith('Move to'))).toBe(false);
    });
  });

  it('closes with the close button', async () => {
    const { fixture, navigate } = await setup({ split: B });
    const close = await loader(fixture).getHarness(
      UiButtonHarness.with({ label: 'Close side by side' }),
    );

    await close.click();

    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { split: null },
      queryParamsHandling: 'merge',
    });
  });

  it('puts the focus on the "Side by side" button after the split closes', async () => {
    const { fixture, element } = await setup({ split: B });
    document.body.append(element);
    const close = await loader(fixture).getHarness(
      UiButtonHarness.with({ label: 'Close side by side' }),
    );
    await close.click();

    fixture.componentRef.setInput('split', undefined);
    await fixture.whenStable();

    const opener = element.querySelector('button[aria-label="Side by side"]');
    expect(opener).not.toBeNull();
    expect(document.activeElement).toBe(opener);
    element.remove();
  });

  it.each([
    ['the picker', ''],
    ['a folder', B],
  ])('has no axe violations with the right half open on %s', async (_name, split) => {
    const { element } = await setup({ split });
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
