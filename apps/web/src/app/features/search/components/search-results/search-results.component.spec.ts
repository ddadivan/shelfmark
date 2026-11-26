import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { of, Subject } from 'rxjs';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import type { LinksApi } from '../../../links/models/links-api.interface';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { SEARCH_DEBOUNCE_MS } from '../../models/search-debounce-ms.const';
import { LinksStore } from '../../../../stores/links.store';
import { LinkOpener } from '../../services/link-opener.service';
import { RecentSearchesService } from '../../services/recent-searches.service';
import { signal } from '@angular/core';
import { SearchResultsComponent } from './search-results.component';

function link(n: number): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Signal ${n}`,
    url: `https://site${n}.example.com/a`,
    folderId: null,
    note: null,
  };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor, pinned: [] };
}

async function setup(
  list: LinksApi['list'] = () => of(page([link(1), link(2)])),
  { screen = false, recent: recentItems = [] as string[] } = {},
) {
  const opener = { open: vi.fn() };
  const recent = { items: signal(recentItems), add: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: { list: vi.fn<LinksApi['list']>(list) } },
      {
        provide: FOLDERS_API,
        useValue: {
          list: () =>
            of({
              items: [{ ...MOCK_FOLDERS[0], id: 'f1', name: 'Signals club', parentId: null }],
              counts: MOCK_LIBRARY_COUNTS,
            }),
        },
      },
      { provide: TAGS_API, useValue: { list: () => of([]) } },
      { provide: LinkActionsService, useValue: { open: vi.fn() } },
      { provide: LinkOpener, useValue: opener },
      { provide: RecentSearchesService, useValue: recent },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(SearchResultsComponent);
  fixture.componentRef.setInput('screen', screen);
  document.body.append(fixture.nativeElement as HTMLElement);
  const done = vi.fn();
  fixture.componentInstance.done.subscribe(done);
  await fixture.whenStable();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { fixture, done, navigate, opener, recent, element: fixture.nativeElement as HTMLElement };
}

const field = (element: HTMLElement): HTMLInputElement => {
  const input = element.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!input) {
    throw new Error('no search field');
  }
  return input;
};
/** Generous: a loaded CI runner is many times slower than a laptop. */
const RESULTS_TIMEOUT_MS = 15_000;
const options = (element: HTMLElement): HTMLElement[] => [
  ...element.querySelectorAll<HTMLElement>('[role="option"]'),
];

async function type(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const element = fixture.nativeElement as HTMLElement;
  const input = field(element);
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 60));
  await fixture.whenStable();
  // The results (or "nothing found") are on screen: wait for the status, do not guess the time.
  await vi.waitFor(
    () => {
      TestBed.tick();
      expect(element.querySelector('[role="status"]')?.textContent?.trim() ?? '').not.toBe('');
    },
    { timeout: RESULTS_TIMEOUT_MS },
  );
}

async function key(
  fixture: ComponentFixture<unknown>,
  name: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  field(fixture.nativeElement as HTMLElement).dispatchEvent(event);
  await fixture.whenStable();
  return event;
}

describe('SearchResultsComponent (the search dialog list)', { timeout: 30_000 }, () => {
  afterEach(() => {
    document.querySelector('app-search-results')?.remove();
  });

  it('lists the links, then the folders and tags, with the active row on the field', async () => {
    const { element, fixture } = await setup();

    await type(fixture, 'signal');

    const texts = options(element).map((option) => option.textContent ?? '');
    const linkRow = texts.findIndex((text) => text.includes('Signal 1'));
    const folderRow = texts.findIndex((text) => text.includes('Signals club'));
    expect(linkRow).toBeGreaterThanOrEqual(0);
    expect(folderRow).toBeGreaterThan(linkRow);
    expect(options(element).map((option) => option.id)).toContain(
      field(element).getAttribute('aria-activedescendant'),
    );
  });

  it('opens a link in a new tab with Enter, finishes and remembers the search', async () => {
    const { done, fixture, opener, recent } = await setup();

    await type(fixture, 'signal');
    await key(fixture, 'Enter');

    expect(opener.open).toHaveBeenCalledWith(expect.stringContaining('https://'), false);
    expect(done).toHaveBeenCalledTimes(1);
    expect(recent.add).toHaveBeenCalledWith('signal');
  });

  it('keeps the list for Cmd+Enter (background tab)', async () => {
    const { done, fixture, opener } = await setup();

    await type(fixture, 'signal');
    await key(fixture, 'Enter', { metaKey: true });

    expect(opener.open).toHaveBeenCalledWith(expect.stringContaining('https://'), true);
    expect(done).not.toHaveBeenCalled();
  });

  it('navigates to "Show all results" and finishes', async () => {
    const { done, element, fixture, navigate, recent } = await setup(() =>
      of(page([link(1)], 'next')),
    );

    await type(fixture, 'signal');
    options(element)
      .find((option) => option.textContent?.includes('Show all results'))
      ?.click();
    await vi.waitFor(() => expect(done).toHaveBeenCalled());

    expect(navigate).toHaveBeenCalledWith(['/links'], { queryParams: { q: 'signal' } });
    expect(recent.add).toHaveBeenCalledWith('signal');
  });

  it('offers the recent searches while the field is empty and searches the one chosen', async () => {
    const { element, fixture } = await setup(undefined, { recent: ['shoes', 'recipes'] });

    const rows = options(element);
    expect(rows.map((row) => row.textContent?.trim())).toEqual(['shoes', 'recipes']);

    rows[0]?.click();
    await fixture.whenStable();

    expect(field(element).value).toBe('shoes');
  });

  it('screen: a Back button before the field finishes the search', async () => {
    const { done, element } = await setup(undefined, { screen: true });

    const back = element.querySelector<HTMLButtonElement>('button[aria-label="Close search"]');
    expect(element.querySelector('ui-command-list')?.classList).toContain(
      'ui-command-list--screen',
    );
    back?.click();

    expect(done).toHaveBeenCalledTimes(1);
  });

  it('focus() puts the caret in the field', async () => {
    const { element, fixture } = await setup();

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(field(element));
  });

  it('says so when nothing matches', async () => {
    const { element, fixture } = await setup(() => of(page([])));

    await type(fixture, 'zzzz');

    expect(element.textContent).toContain('Nothing found for “zzzz”');
  });

  it('keeps the previous results while a new answer loads', async () => {
    const answer = new Subject<ListLinksResponse>();
    let calls = 0;
    const { element, fixture } = await setup(() => {
      calls += 1;
      return calls === 1 ? of(page([link(1)])) : answer;
    });

    await type(fixture, 'signal');
    const input = field(element);
    input.value = 'signal 1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(options(element).some((option) => option.textContent?.includes('Signal 1'))).toBe(true);
    answer.complete();
  });

  it('follows the links store: a rename, a delete and its Undo', async () => {
    const { element, fixture } = await setup();
    await type(fixture, 'signal');
    const links = TestBed.inject(LinksStore);
    const rows = () => options(element).map((option) => option.textContent ?? '');

    links.applyEdit({ ...link(1), title: 'Signal renamed' });
    await fixture.whenStable();
    expect(rows().some((text) => text.includes('Signal renamed'))).toBe(true);

    links.remove('id-2', link(2));
    await fixture.whenStable();
    expect(rows().some((text) => text.includes('Signal 2'))).toBe(false);

    links.undoRemove('id-2');
    await fixture.whenStable();
    expect(rows().some((text) => text.includes('Signal 2'))).toBe(true);
  });

  it('has no axe violations with results', async () => {
    const { element, fixture } = await setup();
    await type(fixture, 'signal');

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
