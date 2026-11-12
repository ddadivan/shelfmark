import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UiDialogRef } from '@shelfmark/ui';
import axe from 'axe-core';
import { of, Subject } from 'rxjs';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import type { LinksApi } from '../../../links/models/links-api.interface';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { SEARCH_DEBOUNCE_MS } from '../../models/search-debounce-ms.const';
import { LinkOpener } from '../../services/link-opener.service';
import { SearchDialogComponent } from './search-dialog.component';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Signal ${n}`,
    url: `https://site${n}.example.com/a`,
    folderId: null,
    note: null,
    ...changes,
  };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor, pinned: [] };
}

async function setup(list: LinksApi['list'] = () => of(page([link(1), link(2)]))) {
  const api = { list: vi.fn<LinksApi['list']>(list) };
  const ref = { close: vi.fn() };
  const actions = { open: vi.fn() };
  const opener = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
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
      {
        provide: TAGS_API,
        useValue: {
          list: () =>
            of([
              {
                id: 't1',
                name: 'signals',
                linkCount: 3,
                createdAt: MOCK_LINKS[0].createdAt,
                updatedAt: MOCK_LINKS[0].createdAt,
              },
            ]),
        },
      },
      { provide: UiDialogRef, useValue: ref },
      { provide: LinkActionsService, useValue: actions },
      { provide: LinkOpener, useValue: opener },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(SearchDialogComponent);
  await fixture.whenStable();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return {
    api,
    ref,
    actions,
    opener,
    navigate,
    fixture,
    element: fixture.nativeElement as HTMLElement,
  };
}

function input(element: HTMLElement): HTMLInputElement {
  const field = element.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!field) {
    throw new Error('no search field');
  }
  return field;
}

async function type(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  const field = input(fixture.nativeElement as HTMLElement);
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
}

function key(element: HTMLElement, name: string, init: KeyboardEventInit = {}): void {
  input(element).dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
  );
}

async function advance(fixture: ComponentFixture<unknown>, ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await fixture.whenStable();
}

describe('SearchDialogComponent', () => {
  it('shows the hint and asks nothing for an empty query', async () => {
    const { api, element } = await setup();

    expect(element.textContent).toContain('Results show up as you type');
    expect(api.list).not.toHaveBeenCalled();
  });

  it('waits for the debounce and asks once with the normalized text', async () => {
    const { api, fixture } = await setup();

    await type(fixture, 'sig');
    await type(fixture, '  signal   ');
    await advance(fixture, SEARCH_DEBOUNCE_MS / 2);
    expect(api.list).not.toHaveBeenCalled();
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);

    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledWith({ q: 'signal', limit: 5 });
  });

  it('cancels the request in flight when the text changes', async () => {
    const first = new Subject<ListLinksResponse>();
    const second = new Subject<ListLinksResponse>();
    const answers = [first, second];
    const { api, fixture } = await setup(() => answers.shift() ?? second);

    await type(fixture, 'a');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    expect(first.observed).toBe(true);
    await type(fixture, 'ab');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);

    expect(api.list).toHaveBeenCalledTimes(2);
    expect(first.observed).toBe(false);
    expect(second.observed).toBe(true);
  });

  it('keeps the old results, marked busy, while new ones load', async () => {
    const pending = new Subject<ListLinksResponse>();
    let calls = 0;
    const { element, fixture } = await setup(() => (calls++ === 0 ? of(page([link(1)])) : pending));

    await type(fixture, 'sig');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    expect(element.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);
    await type(fixture, 'sign');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);

    expect(element.querySelector('[role="listbox"]')?.getAttribute('aria-busy')).toBe('true');
    expect(element.textContent).toContain('Signal 1');
  });

  it('lists links, and folders and tags matched locally', async () => {
    const { element, fixture } = await setup();

    await type(fixture, 'signal');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);

    const options = [...element.querySelectorAll('[role="option"]')].map((o) => o.textContent);
    expect(options.some((text) => text?.includes('Signal 1'))).toBe(true);
    expect(options.some((text) => text?.includes('Signals club'))).toBe(true);
    expect(options.some((text) => text?.includes('signals'))).toBe(true);
    expect(element.querySelectorAll('mark').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('.ui-command-item__leading ui-favicon').length).toBeGreaterThan(
      0,
    );
    expect(element.querySelector('[role="status"]')?.textContent).toContain('4 results');
  });

  it('offers "Show all results" when there is more and opens the library with the query', async () => {
    const { element, fixture, navigate, ref } = await setup(() => of(page([link(1)], 'next')));

    await type(fixture, 'signal');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    [...element.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.includes('Show all results'))
      ?.click();

    await vi.waitFor(() => expect(ref.close).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith(['/links'], { queryParams: { q: 'signal' } });
  });

  it('moves with the arrows and opens the link with Enter, then closes', async () => {
    const { element, fixture, actions, opener, ref } = await setup();

    await type(fixture, 'signal');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    key(element, 'ArrowDown');
    key(element, 'ArrowDown');
    await fixture.whenStable();
    key(element, 'Enter');

    expect(actions.open).toHaveBeenCalledTimes(1);
    expect(opener.open).toHaveBeenCalledWith(expect.stringContaining('https://'), false);
    expect(ref.close).toHaveBeenCalled();
  });

  it('opens in the background with Cmd+Enter and keeps the dialog', async () => {
    const { element, fixture, opener, ref } = await setup();

    await type(fixture, 'signal');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    key(element, 'ArrowDown');
    await fixture.whenStable();
    key(element, 'Enter', { metaKey: true });

    expect(opener.open).toHaveBeenCalledWith(expect.stringContaining('https://'), true);
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('keeps the dialog open when the navigation does not go through', async () => {
    const { element, fixture, navigate, ref } = await setup(() => of(page([link(1)], 'next')));
    navigate.mockResolvedValue(false);

    await type(fixture, 'signal');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    [...element.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.includes('Show all results'))
      ?.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
  });

  describe('note match', () => {
    async function metaOf(query: string, item: LinkResponse): Promise<string> {
      const { element, fixture } = await setup(() => of(page([item])));
      await type(fixture, query);
      await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
      return (
        element.querySelector('[role="option"] .ui-command-item__meta')?.textContent ?? ''
      ).replace(/\s+/gu, ' ');
    }

    it('shows the note when a word is in it and the title lacks the others', async () => {
      const meta = await metaOf(
        'signal interview',
        link(1, { title: 'Signal Forms', note: 'Interview prep' }),
      );

      expect(meta).toContain('note matches:');
      expect(meta).toContain('Interview prep');
    });

    it('does not show the note for a URL-only match', async () => {
      const meta = await metaOf('site1', link(1, { title: 'Forms', note: 'Interview prep' }));

      expect(meta).not.toContain('note matches:');
    });

    it('does not show the note when the title has every word', async () => {
      const meta = await metaOf('signal', link(1, { title: 'Signal', note: 'signal notes' }));

      expect(meta).not.toContain('note matches:');
    });
  });

  it('says so when nothing matches', async () => {
    const { element, fixture } = await setup(() => of(page([])));

    await type(fixture, 'zzzz');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);

    expect(element.textContent).toContain('Nothing found for “zzzz”');
    expect(element.textContent).toContain('Try another word');
  });

  it('says so when the search fails', async () => {
    const failing = new Subject<ListLinksResponse>();
    const { element, fixture } = await setup(() => failing);

    await type(fixture, 'zzzz');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    failing.error(new Error('down'));
    await fixture.whenStable();

    expect(element.textContent).toContain("Couldn't search");
  });

  it('has no axe violations with results', async () => {
    const { element, fixture } = await setup();
    await type(fixture, 'signal');
    await advance(fixture, SEARCH_DEBOUNCE_MS + 60);
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
