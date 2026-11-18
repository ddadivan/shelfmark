import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import {
  AI_SEARCH_STATE,
  MEANING_REASON_SOURCE,
  type AiSearchStatus,
  type LinkResponse,
  type MeaningSearchResponse,
} from '@shelfmark/contracts';
import { MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UiCommandListHarness } from '@shelfmark/ui/testing';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { FOLDERS_API } from '../../../links/models/folders-api.const';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { LinkOpener } from '../../services/link-opener.service';
import { SearchResultsComponent } from './search-results.component';

const READY: AiSearchStatus = { state: AI_SEARCH_STATE.Ready, ready: 10, total: 10 };
const WAIT = { timeout: 5000 } as const;

function link(id: string, title: string, url = `https://${id}.example.com/a`): LinkResponse {
  return { ...MOCK_LINKS[0], id, title, url, folderId: null, note: null, faviconUrl: null };
}

const WORD = link('w1', 'Angular signals: fine-grained reactivity', 'https://youtube.com/watch');
const ZONELESS = link('m1', 'Zoneless change detection, explained', 'https://angular.dev/zoneless');
const STORE = link('m2', 'NgRx SignalStore: patterns for real apps', 'https://dev.to/ngrx');

const MEANING: MeaningSearchResponse = {
  status: READY,
  items: [
    {
      link: ZONELESS,
      why: [
        { source: MEANING_REASON_SOURCE.Summary, text: 'change detection without zone.js' },
        { source: MEANING_REASON_SOURCE.Summary, text: 'faster rendering' },
      ],
    },
    { link: STORE, why: [{ source: MEANING_REASON_SOURCE.Tag, text: 'angular' }] },
    { link: WORD, why: [{ source: MEANING_REASON_SOURCE.Tag, text: 'angular' }] },
  ],
};

interface Options {
  words?: LinkResponse[];
  meaning?: () => ReturnType<ReturnType<typeof fakeAiApi>['searchMeaning']>;
  meaningSearch?: boolean;
  ask?: boolean;
}

async function setup(options: Options = {}) {
  const ai = fakeAiApi(
    aiSettingsResponse({
      settings: {
        ...AI_SETTINGS_DEFAULT,
        enabled: true,
        meaningSearch: options.meaningSearch ?? true,
        ask: options.ask ?? false,
      },
    }),
  );
  ai.searchMeaning.mockImplementation(options.meaning ?? (() => of(MEANING)));
  const opener = { open: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      {
        provide: LINKS_API,
        useValue: {
          list: () => of({ items: options.words ?? [WORD], nextCursor: null, pinned: [] }),
        },
      },
      {
        provide: FOLDERS_API,
        useValue: { list: () => of({ items: [], counts: MOCK_LIBRARY_COUNTS }) },
      },
      { provide: TAGS_API, useValue: { list: () => of([]) } },
      { provide: AI_API, useValue: ai },
      { provide: LinkActionsService, useValue: { open: vi.fn() } },
      { provide: LinkOpener, useValue: opener },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(SearchResultsComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const list = await loader.getHarness(UiCommandListHarness);
  return { ai, opener, fixture, list, element: fixture.nativeElement as HTMLElement };
}

describe('SearchResultsComponent with search by meaning (AI-3)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.replaceChildren());
  });

  it('lists the word matches first, then meaning matches under the divider, without axe violations', async () => {
    const { ai, list, element } = await setup();
    await list.setQuery('talk about signals and performance');
    await vi.waitFor(async () => {
      expect(await list.getDividerHeadings()).toEqual(['Related by meaning']);
    }, WAIT);

    expect(await list.getGroupHeadings()).toEqual(['1 link', 'Related by meaning']);
    expect(await list.getGroupLeads()).toEqual([]);
    expect(ai.searchMeaning).toHaveBeenCalledTimes(1);
    const rows = await Promise.all((await list.getOptions()).map((option) => option.getText()));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain(WORD.title);
    expect(rows[1]).toContain(ZONELESS.title);
    expect(rows[1]).toContain(
      'angular.dev Close to: change detection without zone.js, faster rendering (from the summary)',
    );
    expect(rows[2]).toContain('dev.to Close to: angular');
    const spark = element.querySelector('.search-results__spark');
    expect(spark?.getAttribute('aria-label')).toBe('Generated by AI, may be inaccurate');
    expect(spark?.getAttribute('title')).toBe('Generated by AI, may be inaccurate');
    expect(await list.getStatusText()).toBe('3 results');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('says so when no link has the words and lets the meaning matches carry the result', async () => {
    const { list } = await setup({ words: [] });
    await list.setQuery('that ramen place');
    await vi.waitFor(async () => {
      expect(await list.getGroupLeads()).toEqual(['No links with these words']);
    }, WAIT);
    expect(await list.getGroupHeadings()).toEqual(['Related by meaning']);
    expect(await list.isEmpty()).toBe(false);
    expect(await list.getOptions()).toHaveLength(3);
  });

  it('opens a meaning match like a link', async () => {
    const { list, opener } = await setup({ words: [] });
    await list.setQuery('that ramen place');
    await vi.waitFor(async () => expect(await list.getOptions()).toHaveLength(3), WAIT);
    await list.chooseOption({ text: new RegExp(STORE.title) });
    expect(opener.open).toHaveBeenCalledWith(STORE.url, false);
  });

  it('is exactly today’s search while the switch is off', async () => {
    const { ai, list } = await setup({ meaningSearch: false });
    await list.setQuery('signals');
    await vi.waitFor(async () => expect(await list.getOptions()).toHaveLength(1), WAIT);
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(ai.searchMeaning).not.toHaveBeenCalled();
    expect(await list.getGroupHeadings()).toEqual(['1 link']);
    expect(await list.getDividerHeadings()).toEqual([]);
    expect(await list.getNoteText()).toBe('');
  });

  it('keeps the word matches when the meaning search fails, and the empty state when both are empty', async () => {
    const { list } = await setup({ words: [], meaning: () => throwError(() => new Error('down')) });
    await list.setQuery('that ramen place');
    await vi.waitFor(async () => {
      expect(await list.getStatusText()).toContain('Nothing found for “that ramen place”');
    }, WAIT);
    expect(await list.isEmpty()).toBe(true);
    expect(await list.getDividerHeadings()).toEqual([]);
  });

  it('shows the getting-ready line once per session while links are embedded', async () => {
    const processing = { state: AI_SEARCH_STATE.Processing, ready: 840, total: 1000 };
    const first = await setup({ meaning: () => of({ status: processing, items: [] }) });
    await first.list.setQuery('coat');
    await vi.waitFor(async () => {
      expect(await first.list.getNoteText()).toBe(
        'Search by meaning is getting ready: 840 of 1,000 links. Word matches work as usual.',
      );
    }, WAIT);
    expect(await first.list.getGroupHeadings()).toEqual(['1 link']);
    expect(await axeViolations(first.element)).toEqual([]);

    // A second search field of the same session: words only, no line.
    const second = TestBed.createComponent(SearchResultsComponent);
    await second.whenStable();
    const list = await TestbedHarnessEnvironment.loader(second).getHarness(UiCommandListHarness);
    await list.setQuery('coat');
    await vi.waitFor(async () => expect(await list.getOptions()).toHaveLength(1), WAIT);
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(await list.getNoteText()).toBe('');
  });

  it('ends with the Ask row for a query of 3+ characters and hands the text to Ask', async () => {
    const { list, fixture } = await setup({ ask: true });
    const asked = vi.fn();
    fixture.componentInstance.ask.subscribe(asked);
    await list.setQuery('ra');
    await vi.waitFor(async () => {
      expect(await list.getGroupHeadings()).not.toContain('Ask your shelf');
    }, WAIT);
    await list.setQuery('ramen recipes');
    await vi.waitFor(async () => {
      expect((await list.getGroupHeadings()).at(-1)).toBe('Ask your shelf');
    }, WAIT);
    const options = await list.getOptions();
    const last = options.at(-1);
    expect(await last?.getText()).toContain('Ask your shelf: “ramen recipes”');
    await last?.click();
    expect(asked).toHaveBeenCalledWith('ramen recipes');
  });
});
