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
import { LinkOpener } from '../../services/link-opener.service';
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

async function setup(list: LinksApi['list'] = () => of(page([link(1), link(2)]))) {
  const opener = { open: vi.fn() };
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
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(SearchResultsComponent);
  fixture.componentRef.setInput('popup', true);
  document.body.append(fixture.nativeElement as HTMLElement);
  const done = vi.fn();
  fixture.componentInstance.done.subscribe(done);
  await fixture.whenStable();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { fixture, done, navigate, opener, element: fixture.nativeElement as HTMLElement };
}

const field = (element: HTMLElement): HTMLInputElement =>
  element.querySelector<HTMLInputElement>('input[role="combobox"]')!;
/** Generous: a loaded CI runner is many times slower than a laptop. */
const PANEL_GONE_TIMEOUT_MS = 15_000;
const panel = (): HTMLElement | null => document.querySelector('.ui-command-list__panel');
/** The leave animation and the overlay release take longer on a loaded runner: wait, do not guess. */
const panelGone = (): Promise<void> =>
  vi.waitFor(
    () => {
      // Zoneless: each poll runs change detection, so the removal is never waiting for a tick.
      TestBed.tick();
      expect(panel()).toBeNull();
    },
    { timeout: PANEL_GONE_TIMEOUT_MS },
  );
const options = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('.ui-command-list__panel [role="option"]'),
];

async function type(
  fixture: ComponentFixture<unknown>,
  text: string,
  { waitForResults = true } = {},
): Promise<void> {
  const input = field(fixture.nativeElement as HTMLElement);
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 60));
  await fixture.whenStable();
  if (!waitForResults) {
    return;
  }
  // The results (or "nothing found") are in the panel: a request that answers after the next
  // step is what made these tests depend on the speed of the machine.
  await vi.waitFor(
    () => {
      TestBed.tick();
      expect(
        document.querySelector('.ui-command-list__panel [role="status"]')?.textContent?.trim() ??
          '',
      ).not.toBe('');
    },
    { timeout: PANEL_GONE_TIMEOUT_MS },
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

describe('SearchResultsComponent as the header field (popup)', { timeout: 30_000 }, () => {
  afterEach(() => {
    document.querySelector('app-search-results')?.remove();
    // A panel left open by a test lives in the overlay pane: it must not be the next test's panel.
    document.querySelectorAll('.cdk-overlay-container > *').forEach((node) => {
      node.remove();
    });
  });

  it('is a closed combobox until the first character, then lists the results in a panel', async () => {
    const { element, fixture } = await setup();

    expect(field(element).getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
    expect(element.querySelector('.ui-command-list__field kbd')?.textContent).toMatch(/K$/u);

    await type(fixture, 'signal');

    expect(field(element).getAttribute('aria-expanded')).toBe('true');
    expect(panel()).not.toBeNull();
    const texts = options().map((option) => option.textContent);
    expect(texts.some((text) => text?.includes('Signal 1'))).toBe(true);
    expect(texts.some((text) => text?.includes('Signals club'))).toBe(true);
    expect(options().map((option) => option.id)).toContain(
      field(element).getAttribute('aria-activedescendant'),
    );
  });

  it('opens a link in a new tab with Enter and closes the panel, keeping the text', async () => {
    const { done, element, fixture, opener } = await setup();

    await type(fixture, 'signal');
    await key(fixture, 'Enter');

    expect(opener.open).toHaveBeenCalledWith(expect.stringContaining('https://'), false);
    expect(done).toHaveBeenCalledTimes(1);
    await panelGone();
    expect(field(element).value).toBe('signal');
  });

  it('keeps the panel for Cmd+Enter (background tab)', async () => {
    const { done, fixture, opener } = await setup();

    await type(fixture, 'signal');
    await key(fixture, 'Enter', { metaKey: true });

    expect(opener.open).toHaveBeenCalledWith(expect.stringContaining('https://'), true);
    expect(done).not.toHaveBeenCalled();
    expect(panel()).not.toBeNull();
  });

  it('navigates to "Show all results" and clears the field', async () => {
    const { done, element, fixture, navigate } = await setup(() => of(page([link(1)], 'next')));

    await type(fixture, 'signal');
    options()
      .find((option) => option.textContent?.includes('Show all results'))
      ?.click();
    await vi.waitFor(() => expect(done).toHaveBeenCalled());

    expect(navigate).toHaveBeenCalledWith(['/links'], { queryParams: { q: 'signal' } });
    expect(field(element).value).toBe('');
    await panelGone();
  });

  it('Esc closes the panel and keeps the text, a second Esc clears it', async () => {
    const { element, fixture } = await setup();

    await type(fixture, 'signal');
    await key(fixture, 'Escape');
    await panelGone();
    expect(field(element).value).toBe('signal');

    await key(fixture, 'Escape');
    expect(field(element).value).toBe('');
  });

  it('results that arrive after Esc do not open the closed panel again', async () => {
    const answer = new Subject<ListLinksResponse>();
    const { element, fixture } = await setup(() => answer);

    await type(fixture, 'signal', { waitForResults: false });
    expect(panel()).not.toBeNull();
    await key(fixture, 'Escape');
    await panelGone();

    // The request answers only now (a slow runner or network): the panel stays shut.
    answer.next(page([link(1), link(2)]));
    answer.complete();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 100));
    TestBed.tick();
    expect(panel()).toBeNull();
    expect(field(element).getAttribute('aria-expanded')).toBe('false');
    expect(field(element).value).toBe('signal');
  });

  it('leaves nothing of the open panel in the page when the field is destroyed', async () => {
    const { fixture } = await setup();
    await type(fixture, 'signal');
    expect(panel()).not.toBeNull();

    fixture.destroy();

    expect(document.querySelector('.ui-command-list__popup')).toBeNull();
    expect(panel()).toBeNull();
  });

  it('focus() puts the caret in the field', async () => {
    const { element, fixture } = await setup();

    fixture.componentInstance.focus();

    expect(document.activeElement).toBe(field(element));
  });

  it('says so in the panel when nothing matches', async () => {
    const { fixture } = await setup(() => of(page([])));

    await type(fixture, 'zzzz');

    expect(panel()?.textContent).toContain('Nothing found for “zzzz”');
  });

  it('has no axe violations with the panel open', async () => {
    const { element, fixture } = await setup();
    await type(fixture, 'signal');

    const { violations } = await axe.run([element, panel()!], {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
