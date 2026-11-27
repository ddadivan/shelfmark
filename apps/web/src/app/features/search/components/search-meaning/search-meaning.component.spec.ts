import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import {
  AI_SEARCH_STATE,
  MEANING_REASON_SOURCE,
  type LinkResponse,
  type MeaningSearchResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UiAskButtonHarness, UiButtonHarness } from '@shelfmark/ui/testing';
import { EMPTY, of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { aiSettingsResponse, fakeAiApi } from '../../../../../testing/fake-ai-api';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LinksStore } from '../../../../stores/links.store';
import { AI_API } from '../../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { LibraryFilterService } from '../../../library/services/library-filter.service';
import { LinkPreviewService } from '../../../link-preview/services/link-preview.service';
import { LinkCardComponent } from '../../../links/components/link-card/link-card.component';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import { FolderChipsService } from '../../../links/services/folder-chips.service';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { SearchAskService } from '../../services/search-ask.service';
import { SearchMeaningComponent } from './search-meaning.component';

/** The card itself has its own spec; here only what the section hands it matters. */
@Component({ selector: 'app-link-card', template: '{{ link().title }}' })
class LinkCardStub {
  readonly link = input.required<LinkResponse>();
  readonly headingLevel = input(2);
  readonly showNote = input(true);
  readonly showTags = input(true);
  readonly showFolder = input(true);
  readonly showDate = input(true);
  readonly showDescription = input(true);
  readonly folder = input<unknown>(null);
  readonly previewable = input(false);
  readonly previewRequested = output<void>();
  readonly opened = output<void>();
  readonly openRequested = output<void>();
  readonly favoriteToggled = output<void>();
  readonly editRequested = output<void>();
  readonly moveRequested = output<void>();
  readonly remindRequested = output<void>();
  readonly deleteRequested = output<void>();
}

const WAIT = { timeout: 5000 } as const;

function link(id: string, title: string): LinkResponse {
  return { ...MOCK_LINKS[0], id, title, url: `https://${id}.example.com/a`, folderId: null };
}

const WORD = link('w1', 'Angular signals');
const NEAR = link('m1', 'Zoneless change detection');

const MEANING: MeaningSearchResponse = {
  status: { state: AI_SEARCH_STATE.Ready, ready: 2, total: 2 },
  items: [
    { link: NEAR, why: [{ source: MEANING_REASON_SOURCE.Tag, text: 'angular' }] },
    { link: WORD, why: [{ source: MEANING_REASON_SOURCE.Tag, text: 'angular' }] },
  ],
};

interface Options {
  empty?: boolean;
  words?: LinkResponse[];
  meaning?: MeaningSearchResponse;
  ask?: boolean;
  scope?: string;
}

async function setup(options: Options = {}) {
  const query = 'signals talk';
  const ai = fakeAiApi(
    aiSettingsResponse({
      settings: {
        ...AI_SETTINGS_DEFAULT,
        enabled: true,
        meaningSearch: true,
        ask: options.ask ?? false,
      },
    }),
  );
  ai.searchMeaning.mockImplementation(() => of(options.meaning ?? MEANING));
  const filters = {
    query: signal(query),
    scope: signal(options.scope ?? LINKS_SCOPE.All),
    gridColumn: signal(232),
    fieldShown: () => true,
    clearSearch: vi.fn(),
    searchEverywhere: vi.fn(),
  };
  const asker = { ask: vi.fn(() => Promise.resolve()) };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: AI_API, useValue: ai },
      { provide: LibraryFilterService, useValue: filters },
      {
        provide: LinksStore,
        useValue: {
          linkChanges: EMPTY,
          loading: signal(false),
          filter: signal({ scope: LINKS_SCOPE.All, q: query }),
          entities: signal(options.words ?? [WORD]),
        },
      },
      { provide: LinkPreviewService, useValue: { open: vi.fn() } },
      { provide: FolderChipsService, useValue: { of: () => null } },
      { provide: LinkActionsService, useValue: { open: vi.fn() } },
      { provide: SearchAskService, useValue: asker },
    ],
  });
  TestBed.overrideComponent(SearchMeaningComponent, {
    remove: { imports: [LinkCardComponent] },
    add: { imports: [LinkCardStub] },
  });
  await loadEnglish();
  await TestBed.inject(AiSettingsStore).load();
  const fixture = TestBed.createComponent(SearchMeaningComponent);
  fixture.componentRef.setInput('empty', options.empty ?? false);
  await fixture.whenStable();
  return { fixture, ai, filters, asker, element: fixture.nativeElement as HTMLElement };
}

describe('SearchMeaningComponent', () => {
  it('shows "Close in meaning" with the meaning matches that are not word matches', async () => {
    const { fixture, element } = await setup();

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.querySelector('h2')?.textContent).toContain('Close in meaning');
    }, WAIT);
    const cards = [...element.querySelectorAll('app-link-card')].map((card) => card.textContent);
    expect(cards).toEqual(['Zoneless change detection']);
    expect(element.querySelector('h2')?.textContent).toContain('1');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('with no word match, leads with "No links with these words"', async () => {
    const { fixture, element } = await setup({ empty: true, words: [] });

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.textContent).toContain('No links with these words');
    }, WAIT);
    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
  });

  it('with only meaning matches on a scoped feed, offers "Search all links" under the lead', async () => {
    const { fixture, element, filters } = await setup({
      empty: true,
      words: [],
      scope: LINKS_SCOPE.Favorites,
    });
    const loader = TestbedHarnessEnvironment.loader(fixture);

    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.textContent).toContain('No links with these words');
    }, WAIT);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Search all links' }))).click();

    expect(filters.searchEverywhere).toHaveBeenCalledTimes(1);
  });

  it('with nothing at all, is "Nothing found" with Clear search and Ask your shelf', async () => {
    const { fixture, element, filters, asker } = await setup({
      empty: true,
      words: [],
      ask: true,
      meaning: { ...MEANING, items: [] },
    });
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    expect(element.textContent).toContain('Nothing found');
    expect(element.textContent).toContain('it also searches by meaning');
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Clear search' }))).click();
    // Ask your shelf is the header's Ask pill (author): the same hover glow, no sage icon.
    expect(element.querySelector('ui-ask-button')?.textContent).toContain('Ask your shelf');
    await (await loader.getHarness(UiAskButtonHarness)).click();

    expect(filters.clearSearch).toHaveBeenCalledTimes(1);
    expect(asker.ask).toHaveBeenCalledWith('signals talk');
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Search all links' })),
    ).toHaveLength(0);
  });

  it('offers "Search all links" outside All links and no Ask while it is off', async () => {
    const { fixture, element, filters } = await setup({
      empty: true,
      words: [],
      scope: LINKS_SCOPE.Unsorted,
      meaning: { ...MEANING, items: [] },
    });
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    expect(element.textContent).not.toContain('it also searches by meaning');
    expect(
      await loader.getAllHarnesses(UiButtonHarness.with({ text: 'Ask your shelf' })),
    ).toHaveLength(0);
    await (await loader.getHarness(UiButtonHarness.with({ text: 'Search all links' }))).click();
    expect(filters.searchEverywhere).toHaveBeenCalledTimes(1);
  });

  it('renders nothing under the word results without meaning matches', async () => {
    const { fixture, element } = await setup({ meaning: { ...MEANING, items: [] } });
    await fixture.whenStable();

    expect(element.textContent?.trim()).toBe('');
  });
});
