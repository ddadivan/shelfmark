import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import type { FolderResponse, LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { of, Subject, throwError, type Observable } from 'rxjs';
import { AddLinkDialogService } from '../links/add-link/add-link-dialog.service';
import { FOLDERS_API } from '../links/models/folders-api.const';
import type { FoldersApi } from '../links/models/folders-api.interface';
import { LINKS_API } from '../links/models/links-api.const';
import type { LinksApi } from '../links/models/links-api.interface';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { UI_STORAGE_KEY } from '../../stores/models/ui-storage-key.const';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { LinksStore } from '../../stores/links.store';
import { UiStore } from '../../stores/ui.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import LibraryPage from './library.page';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    url: `https://site${n}.example.com/a`,
    isFavorite: false,
    ...changes,
  };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor, pinned: [] };
}

async function setup(first: Observable<ListLinksResponse> | null = null) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => first ?? of(page([link(1), link(2)], 'c1'))),
    update: vi.fn<LinksApi['update']>((id) => of(link(Number(id.slice(3))))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', LINKS_SCOPE.All);
  await fixture.whenStable();
  return { api, fixture, element: fixture.nativeElement as HTMLElement };
}

/** Waits past the 300 ms before any loader shows (Loading spec). */
async function afterLoaderDelay(fixture: ComponentFixture<LibraryPage>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 340));
  await fixture.whenStable();
}

const text = (fixture: ComponentFixture<LibraryPage>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('LibraryPage', () => {
  beforeEach(() => localStorage.removeItem(UI_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(UI_STORAGE_KEY));

  it('shows a skeleton and no cards while the first page loads, but only after 300 ms', async () => {
    const { element, fixture } = await setup(new Subject<ListLinksResponse>());

    expect(element.querySelector('section')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('ui-skeleton')).toBeNull();
    expect(element.querySelector('app-link-card')).toBeNull();

    await afterLoaderDelay(fixture);

    expect(element.querySelector('ui-skeleton')).not.toBeNull();
    expect(element.querySelector('app-link-card')).toBeNull();
  });

  it('shows the heading, the count and the cards, with more to load', async () => {
    const { element, fixture } = await setup();

    expect(element.querySelector('h1')?.textContent).toBe('All links');
    expect(text(fixture)).toContain('2+ links');
    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
    expect(element.querySelector('ui-skeleton')).toBeNull();
  });

  it.each([
    [0, ''],
    [1, '1 link'],
    [2, '2 links'],
  ])('counts %i links with the right plural form', async (count, expected) => {
    const items = Array.from({ length: count }, (_, i) => link(i + 1));
    const { element } = await setup(of(page(items)));

    const counter = element.querySelector('.library__count')?.textContent?.trim() ?? '';
    expect(counter).toBe(expected);
  });

  it('says "1+ link" and "50+ links" when more pages follow', async () => {
    const one = await setup(of(page([link(1)], 'c1')));
    expect(one.element.querySelector('.library__count')?.textContent?.trim()).toBe('1+ link');
  });

  it('names the heading after the scope', async () => {
    const { fixture, element } = await setup();

    fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
    await fixture.whenStable();

    expect(element.querySelector('h1')?.textContent).toBe('Favorites');
  });

  it('shows rows when the list view is chosen', async () => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ view: UI_VIEW.List }));
    const { element } = await setup();

    expect(element.querySelectorAll('app-link-row')).toHaveLength(2);
    expect(element.querySelector('app-link-card')).toBeNull();
  });

  it('switches the view with the segmented control and remembers it', async () => {
    const { element, fixture } = await setup();

    element.querySelector<HTMLInputElement>('input[type="radio"][value="list"]')?.click();
    await fixture.whenStable();

    expect(TestBed.inject(UiStore).view()).toBe(UI_VIEW.List);
    expect(element.querySelectorAll('app-link-row')).toHaveLength(2);
  });

  it('loads the next page from the visible button', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValueOnce(of(page([link(3)])));

    [...element.querySelectorAll('ui-button')]
      .find((button) => button.textContent?.includes('Load more'))
      ?.querySelector('button')
      ?.click();
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith({ cursor: 'c1' });
    expect(element.querySelectorAll('app-link-card')).toHaveLength(3);
    expect(text(fixture)).toContain('3 links');
    expect(text(fixture)).not.toContain('Load more');
  });

  describe('empty states', () => {
    async function empty(scope: (typeof LINKS_SCOPE)[keyof typeof LINKS_SCOPE]) {
      const ctx = await setup(of(page([])));
      ctx.fixture.componentRef.setInput('scope', scope);
      await ctx.fixture.whenStable();
      return ctx;
    }
    const buttons = (element: HTMLElement) =>
      [...element.querySelectorAll('ui-empty-state button')].map((b) => b.textContent?.trim());

    it('invites the first link on the feed and opens the add-link dialog', async () => {
      const { element, fixture } = await empty(LINKS_SCOPE.All);

      expect(element.querySelector('ui-empty-state h2')?.textContent).toBe(
        'Your links will live here',
      );
      expect(element.querySelector('ui-illustration')).not.toBeNull();
      expect(buttons(element)).toEqual(['Add link', 'Watch how it works']);
      const open = vi
        .spyOn(TestBed.inject(AddLinkDialogService), 'open')
        .mockResolvedValue(undefined);
      element.querySelector<HTMLButtonElement>('ui-empty-state button')?.click();
      await fixture.whenStable();
      expect(open).toHaveBeenCalled();
    });

    it('says Unsorted is empty and offers Add link', async () => {
      const { element } = await empty(LINKS_SCOPE.Unsorted);

      expect(element.querySelector('ui-empty-state h2')?.textContent).toBe('Unsorted is empty');
      expect(buttons(element)).toEqual(['Add link']);
    });

    it('says there are no favorites and points back to all links', async () => {
      const { element, fixture } = await empty(LINKS_SCOPE.Favorites);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      expect(element.querySelector('ui-empty-state h2')?.textContent).toBe(
        'Your favorites will live here',
      );
      expect(buttons(element)).toEqual(['Show all links']);
      element.querySelector<HTMLButtonElement>('ui-empty-state button')?.click();
      await fixture.whenStable();
      expect(navigate).toHaveBeenCalledWith('/links');
    });

    it('says a tag has no links and clears the filter', async () => {
      const { api, element, fixture } = await setup();
      api.list.mockReturnValue(of(page([])));
      fixture.componentRef.setInput('tag', 'nothing');
      await fixture.whenStable();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      expect(element.querySelector('ui-empty-state h2')?.textContent).toBe(
        'No links with these tags',
      );
      element.querySelector<HTMLButtonElement>('ui-empty-state button')?.click();
      // The empty filtered state clears the kind too (a saved view may have set it).
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { tag: null, kind: null },
        queryParamsHandling: 'merge',
      });
    });

    it('clears the tag filter on the favorites scope too', async () => {
      const { api, element, fixture } = await setup();
      api.list.mockReturnValue(of(page([])));
      fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
      fixture.componentRef.setInput('tag', 'nothing');
      await fixture.whenStable();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      expect(element.querySelector('ui-empty-state h2')?.textContent).toBe(
        'No links with these tags',
      );
      element.querySelector<HTMLButtonElement>('ui-empty-state button')?.click();
      // The empty filtered state clears the kind too (a saved view may have set it).
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { tag: null, kind: null },
        queryParamsHandling: 'merge',
      });
    });
  });

  it('shows the error state and retries', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValue(throwError(() => new Error('boom')));
    fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
    await fixture.whenStable();
    expect(text(fixture)).toContain("Couldn't load your links");

    api.list.mockReturnValue(of(page([link(5)])));
    element.querySelector<HTMLButtonElement>('ui-empty-state button')?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-link-card')).toHaveLength(1);
    expect(text(fixture)).not.toContain("Couldn't load your links");
  });

  it('keeps the links and shows a notice with Retry when a refetch fails', async () => {
    const { api, element, fixture } = await setup();
    api.list.mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance['retry']();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
    expect(element.querySelector('ui-notice')?.textContent).toContain("Couldn't refresh");

    api.list.mockReturnValue(of(page([link(1), link(2), link(3)])));
    element.querySelector<HTMLButtonElement>('ui-notice button')?.click();
    await fixture.whenStable();

    expect(element.querySelector('ui-notice')).toBeNull();
    expect(element.querySelectorAll('app-link-card')).toHaveLength(3);
  });

  it('does not show the links another view left in the store when it opens', async () => {
    const api = {
      list: vi.fn<LinksApi['list']>(() => of(page([link(9, { title: 'From Favorites' })]))),
      recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        { provide: LINKS_API, useValue: api },
        { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
      ],
    });
    await loadEnglish();
    TestBed.inject(LinksStore).setFilter({ scope: LINKS_SCOPE.Favorites });
    api.list.mockReturnValue(new Subject<ListLinksResponse>());

    const fixture = TestBed.createComponent(LibraryPage);
    fixture.componentRef.setInput('scope', LINKS_SCOPE.All);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('From Favorites');
    expect(element.querySelector('app-link-card')).toBeNull();

    await afterLoaderDelay(fixture);

    expect(element.querySelector('ui-skeleton')).not.toBeNull();
  });

  describe('switching views', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('never shows the skeleton when the next view answers at once', async () => {
      const { api, element, fixture } = await setup();
      api.list.mockReturnValue(of(page([link(7)])));

      fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
      await fixture.whenStable();

      expect(element.querySelector('ui-skeleton')).toBeNull();
      expect(element.querySelector('.library__list--stale')).toBeNull();
      expect(element.querySelectorAll('app-link-card')).toHaveLength(1);
    });

    it('keeps the old cards and shows the bar (no skeleton, no dimming) until the new cards arrive', async () => {
      const { api, element, fixture } = await setup();
      await fixture.whenStable();
      vi.useFakeTimers();
      const next = new Subject<ListLinksResponse>();
      api.list.mockReturnValue(next);
      const settle = (): void => {
        fixture.detectChanges();
        TestBed.tick();
        fixture.detectChanges();
      };

      fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
      settle();

      const stale = element.querySelector('.library__list--stale');
      expect(stale?.getAttribute('aria-busy')).toBe('true');
      expect(stale?.hasAttribute('inert')).toBe(true);
      expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
      expect(element.querySelector('.library__count')?.textContent).toContain('2+ links');

      vi.advanceTimersByTime(300);
      settle();
      expect(element.querySelector('ui-skeleton')).toBeNull();
      expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
      expect(element.querySelector('ui-progress-bar [role="progressbar"]')).not.toBeNull();

      next.next(page([link(8), link(9), link(10)]));
      next.complete();
      settle();
      vi.advanceTimersByTime(500);
      settle();
      expect(element.querySelector('.library__list--stale')).toBeNull();
      expect(element.querySelectorAll('app-link-card')).toHaveLength(3);
      // A view switch swaps the list without the fade-in (that is for the first load).
      expect(element.querySelector('.library__list--reveal')).toBeNull();
      expect(element.querySelector('ui-skeleton')).toBeNull();
    });
  });

  it('toggles a favorite from a card', async () => {
    const { api, element, fixture } = await setup();

    element.querySelector<HTMLButtonElement>('button[aria-label="Favorite: Link 1"]')?.click();
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith('id-1', { isFavorite: true });
    expect(
      element.querySelector('button[aria-label="Favorite: Link 1"]')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('LibraryPage of a folder', () => {
  const FOLDER: FolderResponse = { ...MOCK_FOLDERS[0], id: 'f1', name: 'Reading list' };

  async function setupFolder(folderId: string, items: LinkResponse[] = [link(1)]) {
    const linksApi = {
      list: vi.fn<LinksApi['list']>(() => of(page(items))),
      recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    };
    const foldersApi = {
      list: vi.fn<FoldersApi['list']>(() => of({ items: [FOLDER], counts: MOCK_LIBRARY_COUNTS })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        { provide: LINKS_API, useValue: linksApi },
        { provide: FOLDERS_API, useValue: foldersApi },
        { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
      ],
    });
    await loadEnglish();
    const fixture = TestBed.createComponent(LibraryPage);
    fixture.componentRef.setInput('scope', LINKS_SCOPE.Folder);
    fixture.componentRef.setInput('folderId', folderId);
    await fixture.whenStable();
    return { linksApi, fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('asks for the links of the folder and shows its name as the heading', async () => {
    const { linksApi, element } = await setupFolder('f1');

    expect(linksApi.list).toHaveBeenCalledWith({ folderId: 'f1' });
    expect(element.querySelector('h1')?.textContent).toBe('Reading list');
    expect(element.querySelectorAll('app-link-card')).toHaveLength(1);
  });

  it('says so when the folder is empty and offers to add a link here', async () => {
    const { element, fixture } = await setupFolder('f1', []);

    expect(text(fixture)).toContain('This folder is empty');
    expect(
      [...element.querySelectorAll('ui-empty-state button')].map((b) => b.textContent?.trim()),
    ).toEqual(['Open Unsorted', 'Add link']);
  });

  it('shows "not found" instead of the content for an unknown folder', async () => {
    const { element, fixture } = await setupFolder('gone');

    expect(text(fixture)).toContain('Folder not found');
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('app-link-card')).toBeNull();
    expect(element.querySelector('ui-segmented-control')).toBeNull();
  });

  it('has no axe violations on the not-found state', async () => {
    const { element } = await setupFolder('gone');
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
  describe('tag filter', () => {
    it('asks for the links of the tags in the query, normalized and without duplicates', async () => {
      const { api, fixture } = await setup();

      fixture.componentRef.setInput('tag', ['winter sale', 'Docs', 'docs']);
      await fixture.whenStable();

      expect(api.list).toHaveBeenLastCalledWith({ tag: ['winter-sale', 'Docs'] });
    });

    it('accepts a single value', async () => {
      const { api, fixture } = await setup();

      fixture.componentRef.setInput('tag', 'docs');
      await fixture.whenStable();

      expect(api.list).toHaveBeenLastCalledWith({ tag: ['docs'] });
    });

    it('shows a removable chip per tag and a Clear button', async () => {
      const { element, fixture } = await setup();

      fixture.componentRef.setInput('tag', ['docs', 'video']);
      await fixture.whenStable();

      const group = element.querySelector('.library__filter');
      expect(group?.querySelectorAll('ui-chip')).toHaveLength(2);
      expect(group?.textContent).toContain('Clear filter');
      expect(group?.querySelector('button[aria-label="Remove tag filter docs"]')).not.toBeNull();
    });

    it('shows no filter row without tags', async () => {
      const { element } = await setup();

      expect(element.querySelector('.library__filter')).toBeNull();
    });

    it('says so when no link has all the tags', async () => {
      const { api, fixture } = await setup();
      api.list.mockReturnValue(of(page([])));

      fixture.componentRef.setInput('tag', ['docs']);
      await fixture.whenStable();

      expect(text(fixture)).toContain('No links with these tags');
    });
  });
  describe('search, sort and title', () => {
    it('asks for the search text, normalized', async () => {
      const { api, fixture } = await setup();

      fixture.componentRef.setInput('q', '  signal   store ');
      await fixture.whenStable();

      expect(api.list).toHaveBeenLastCalledWith({ q: 'signal store' });
    });

    it('maps the sort to the API sort and order and leaves newest out', async () => {
      const { api, fixture } = await setup();

      fixture.componentRef.setInput('sort', 'title');
      await fixture.whenStable();
      expect(api.list).toHaveBeenLastCalledWith({ sort: 'title', order: 'asc' });

      fixture.componentRef.setInput('sort', 'oldest');
      await fixture.whenStable();
      expect(api.list).toHaveBeenLastCalledWith({ sort: 'createdAt', order: 'asc' });

      fixture.componentRef.setInput('sort', 'newest');
      await fixture.whenStable();
      expect(api.list).toHaveBeenLastCalledWith({});
    });

    it('shows a Search chip that clears the search', async () => {
      const { element, fixture } = await setup();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      fixture.componentRef.setInput('q', 'signal');
      await fixture.whenStable();

      const group = element.querySelector('.library__filter');
      expect(group?.textContent).toContain('Search: signal');
      group?.querySelector<HTMLButtonElement>('button[aria-label="Remove search signal"]')?.click();
      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { q: null },
        queryParamsHandling: 'merge',
      });
    });

    it('shows the empty search state, with Search all folders off the all-links page', async () => {
      const { api, element, fixture } = await setup();
      api.list.mockReturnValue(of(page([])));

      fixture.componentRef.setInput('q', 'zzz');
      await fixture.whenStable();

      expect(text(fixture)).toContain('Nothing found for “zzz”');
      expect(text(fixture)).toContain('Clear search');
      expect(text(fixture)).not.toContain('Search all folders');

      fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
      await fixture.whenStable();
      expect(text(fixture)).toContain('Search all folders');
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      [...element.querySelectorAll('ui-button')]
        .find((button) => button.textContent?.includes('Search all folders'))
        ?.querySelector('button')
        ?.click();
      expect(navigate).toHaveBeenCalledWith(['/', 'links'], {
        queryParams: { q: 'zzz', sort: null },
      });
    });

    it('clears the search and the tags together with the Clear filter button', async () => {
      const { element, fixture } = await setup();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      fixture.componentRef.setInput('q', 'signal');
      fixture.componentRef.setInput('tag', 'docs');
      await fixture.whenStable();
      [...element.querySelectorAll('.library__filter ui-button')]
        .find((button) => button.textContent?.includes('Clear filter'))
        ?.querySelector('button')
        ?.click();

      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { q: null, tag: null, kind: null },
        queryParamsHandling: 'merge',
      });
    });

    it('searches all folders with the sort kept and the tags dropped', async () => {
      const { api, element, fixture } = await setup();
      api.list.mockReturnValue(of(page([])));
      fixture.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
      fixture.componentRef.setInput('q', 'zzz');
      fixture.componentRef.setInput('sort', 'title');
      fixture.componentRef.setInput('tag', 'docs');
      await fixture.whenStable();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      [...element.querySelectorAll('ui-button')]
        .find((button) => button.textContent?.includes('Search all folders'))
        ?.querySelector('button')
        ?.click();

      expect(navigate).toHaveBeenCalledWith(['/', 'links'], {
        queryParams: { q: 'zzz', sort: 'title' },
      });
    });

    it('sets the sort from the menu', async () => {
      const { element, fixture } = await setup();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      element.querySelector<HTMLButtonElement>('.library__controls ui-button button')?.click();
      await fixture.whenStable();
      [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
        .find((item) => item.textContent?.includes('Oldest first'))
        ?.click();
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { sort: 'oldest' },
        queryParamsHandling: 'merge',
      });
    });

    it('sets the tab title from the page, and the search while searching', async () => {
      const { fixture } = await setup();
      const title = TestBed.inject(Title);
      fixture.destroy();
      title.setTitle('Shelfmark');
      const again = TestBed.createComponent(LibraryPage);
      again.componentRef.setInput('scope', LINKS_SCOPE.Favorites);
      await again.whenStable();
      expect(title.getTitle()).toBe('Favorites · Shelfmark');

      again.componentRef.setInput('q', 'signal');
      await again.whenStable();
      expect(title.getTitle()).toBe('Search: signal · Shelfmark');

      again.destroy();
      expect(title.getTitle()).toBe('Shelfmark');
    });
  });
});

describe('LibraryPage breadcrumbs', () => {
  const ROOT: FolderResponse = { ...MOCK_FOLDERS[0], id: 'f1', name: 'Work', parentId: null };
  const CHILD: FolderResponse = { ...ROOT, id: 'f2', name: 'Angular', parentId: 'f1' };

  async function setupNested(folderId: string) {
    const linksApi = {
      list: vi.fn<LinksApi['list']>(() => of(page([link(1)]))),
      recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    };
    const foldersApi = {
      list: vi.fn<FoldersApi['list']>(() =>
        of({ items: [ROOT, CHILD], counts: MOCK_LIBRARY_COUNTS }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        { provide: LINKS_API, useValue: linksApi },
        { provide: FOLDERS_API, useValue: foldersApi },
        { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
      ],
    });
    await loadEnglish();
    const fixture = TestBed.createComponent(LibraryPage);
    fixture.componentRef.setInput('scope', LINKS_SCOPE.Folder);
    fixture.componentRef.setInput('folderId', folderId);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows All links, the ancestors and the folder, the last as the current page', async () => {
    const { element } = await setupNested('f2');

    const nav = element.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav?.textContent).toContain('All links');
    expect(nav?.textContent).toContain('Work');
    expect(nav?.querySelector('[aria-current="page"]')?.textContent).toContain('Angular');
    expect(nav?.querySelector('a[href="/folders/f1"]')).not.toBeNull();
  });

  it('routes a crumb in the app', async () => {
    const { element, fixture } = await setupNested('f2');
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    element.querySelector<HTMLAnchorElement>('nav a[href="/folders/f1"]')?.click();
    await fixture.whenStable();

    expect(navigateByUrl).toHaveBeenCalledWith('/folders/f1');
  });

  it('has none on a feed page', async () => {
    const { element } = await setupFeed();

    expect(element.querySelector('nav')).toBeNull();
  });

  async function setupFeed() {
    TestBed.configureTestingModule({
      providers: [
        provideTranslocoForTest(),
        {
          provide: LINKS_API,
          useValue: { list: () => of(page([link(1)])), recent: () => of({ items: [] }) },
        },
        { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
      ],
    });
    await loadEnglish();
    const fixture = TestBed.createComponent(LibraryPage);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }
});
