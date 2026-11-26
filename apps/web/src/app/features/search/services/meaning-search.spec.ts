import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AI_SEARCH_STATE,
  MEANING_REASON_SOURCE,
  type AiSearchStatus,
  type LinkResponse,
  type MeaningSearchResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { aiSettingsResponse, fakeAiApi } from '../../../../testing/fake-ai-api';
import { AI_API } from '../../ai/models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../../ai/models/ai-settings-default.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { MEANING_DEBOUNCE_MS } from '../models/meaning-debounce-ms.const';
import type { SearchState } from '../models/search-state.interface';
import { MeaningSearch } from './meaning-search';
import { MeaningHintService } from './meaning-hint.service';

const READY: AiSearchStatus = { state: AI_SEARCH_STATE.Ready, ready: 10, total: 10 };

function link(id: string): LinkResponse {
  return { ...MOCK_LINKS[0], id, title: `Link ${id}` };
}

function answer(ids: string[], status: AiSearchStatus = READY): MeaningSearchResponse {
  return {
    status,
    items: ids.map((id) => ({
      link: link(id),
      why: [{ source: MEANING_REASON_SOURCE.Tag, text: 'angular' }],
    })),
  };
}

function words(query: string, ids: string[] = []): SearchState {
  return { query, links: ids.map(link), more: false, failed: false };
}

async function setup(meaningSearch = true, enabled = true) {
  const api = fakeAiApi(
    aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled, meaningSearch } }),
  );
  api.searchMeaning.mockImplementation(() => of(answer(['m1', 'w1'])));
  TestBed.configureTestingModule({
    providers: [
      MeaningSearch,
      { provide: AI_API, useValue: api },
      {
        provide: LINKS_API,
        useValue: { update: vi.fn(() => of({ ...link('m1'), isFavorite: true })) },
      },
      {
        provide: PinsStore,
        useValue: { dropLink: vi.fn(), refresh: vi.fn(() => Promise.resolve()) },
      },
    ],
  });
  await TestBed.inject(AiSettingsStore).load();
  const text = signal('');
  const state = signal(words(''));
  const meaning = TestBed.inject(MeaningSearch);
  meaning.connect({ text, words: state });
  /** The user typed `query` and its word answer settled. */
  const settle = (query: string, ids: string[] = []) => {
    text.set(query);
    state.set(words(query, ids));
    TestBed.tick();
  };
  return { api, meaning, text, state, settle };
}

async function wait(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  TestBed.tick();
}

describe('MeaningSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks once the word answer settled and the text stayed, then drops the word matches', async () => {
    const { api, meaning, settle } = await setup();
    settle('signals', ['w1']);
    expect(meaning.pending()).toBe(true);
    await wait(MEANING_DEBOUNCE_MS - 50);
    expect(api.searchMeaning).not.toHaveBeenCalled();
    await wait(60);
    expect(api.searchMeaning).toHaveBeenCalledWith('signals', 3);
    expect(meaning.pending()).toBe(false);
    expect(meaning.rows().map((row) => row.link.id)).toEqual(['m1']);
    expect(meaning.rows()[0]?.why).toEqual({ key: 'ai.search.why', reasons: 'angular' });
    expect(meaning.hint()).toBeNull();
  });

  it('follows the links store: a starred card changes, a deleted one leaves and Undo brings it back', async () => {
    const { meaning, settle } = await setup();
    const links = TestBed.inject(LinksStore);
    settle('signals', ['w1']);
    await wait(MEANING_DEBOUNCE_MS + 10);
    expect(meaning.rows().map((row) => row.link.id)).toEqual(['m1']);

    // Not in the library feed: the store takes the link from the card and tells the others.
    await links.toggleFavorite('m1', { ...link('m1'), isFavorite: false });
    expect(meaning.rows()[0]?.link.isFavorite).toBe(true);

    links.remove('m1', link('m1'));
    expect(meaning.rows()).toEqual([]);
    links.undoRemove('m1');
    expect(meaning.rows().map((row) => row.link.id)).toEqual(['m1']);
  });

  it('waits while the text runs ahead of the word answer and restarts the pause', async () => {
    const { api, text, settle } = await setup();
    settle('signal');
    await wait(MEANING_DEBOUNCE_MS - 100);
    text.set('signals');
    TestBed.tick();
    await wait(MEANING_DEBOUNCE_MS);
    expect(api.searchMeaning).not.toHaveBeenCalled();
    settle('signals');
    await wait(MEANING_DEBOUNCE_MS);
    expect(api.searchMeaning).toHaveBeenCalledTimes(1);
    expect(api.searchMeaning).toHaveBeenCalledWith('signals', 3);
  });

  it('cancels a stale call and shows only the answer for the words on screen', async () => {
    const { api, meaning, settle } = await setup();
    const first = new Subject<MeaningSearchResponse>();
    api.searchMeaning.mockImplementationOnce(() => first);
    settle('signals');
    await wait(MEANING_DEBOUNCE_MS);
    settle('reactivity');
    await wait(MEANING_DEBOUNCE_MS);
    expect(first.observed).toBe(false);
    expect(meaning.rows().map((row) => row.link.id)).toEqual(['m1', 'w1']);
    settle('reactivity again');
    expect(meaning.rows()).toEqual([]);
  });

  it('never asks while search by meaning or AI is off, or for fewer than 3 characters', async () => {
    const off = await setup(false);
    off.settle('signals');
    await wait(MEANING_DEBOUNCE_MS * 2);
    expect(off.api.searchMeaning).not.toHaveBeenCalled();
    expect(off.meaning.pending()).toBe(false);
    TestBed.resetTestingModule();

    const aiOff = await setup(true, false);
    aiOff.settle('signals');
    await wait(MEANING_DEBOUNCE_MS * 2);
    expect(aiOff.api.searchMeaning).not.toHaveBeenCalled();
    TestBed.resetTestingModule();

    const short = await setup();
    short.settle('si');
    expect(short.meaning.pending()).toBe(false);
    await wait(MEANING_DEBOUNCE_MS * 2);
    expect(short.api.searchMeaning).not.toHaveBeenCalled();
  });

  it('hides its rows at once when the switch goes off', async () => {
    const { meaning, settle } = await setup();
    settle('signals');
    await wait(MEANING_DEBOUNCE_MS);
    expect(meaning.rows()).toHaveLength(2);
    void TestBed.inject(AiSettingsStore).update({ meaningSearch: false });
    TestBed.tick();
    expect(meaning.rows()).toEqual([]);
  });

  it('turns a failure into no meaning results', async () => {
    const { api, meaning, settle } = await setup();
    api.searchMeaning.mockImplementation(() => throwError(() => new Error('down')));
    settle('signals');
    await wait(MEANING_DEBOUNCE_MS);
    expect(meaning.rows()).toEqual([]);
    expect(meaning.pending()).toBe(false);
    expect(meaning.hint()).toBeNull();
  });

  it('shows the getting-ready line once per session and passes the status to the store', async () => {
    const { api, meaning, settle } = await setup();
    const processing = { state: AI_SEARCH_STATE.Processing, ready: 840, total: 1000 };
    api.searchMeaning.mockImplementation(() => of(answer(['m1'], processing)));
    settle('signals');
    await wait(MEANING_DEBOUNCE_MS);
    expect(meaning.rows()).toEqual([]);
    expect(meaning.hint()).toEqual({ ready: '840', total: '1,000' });
    expect(TestBed.inject(AiSettingsStore).searchStatus()).toEqual(processing);
    settle('reactivity');
    await wait(MEANING_DEBOUNCE_MS);
    expect(meaning.hint()).toBeNull();
    expect(TestBed.inject(MeaningHintService).claim()).toBe(false);
  });

  it('does not use up the getting-ready line for an answer that never shows', async () => {
    const { api, meaning, text, state, settle } = await setup();
    const processing = { state: AI_SEARCH_STATE.Processing, ready: 3, total: 10 };
    const late = new Subject<MeaningSearchResponse>();
    api.searchMeaning.mockImplementation(() => late);
    settle('signals');
    await wait(MEANING_DEBOUNCE_MS);
    // The words move on before the meaning answer arrives: it is not the one on screen.
    text.set('signalsx');
    state.set(words('signalsx'));
    late.next(answer([], processing));
    TestBed.tick();
    expect(meaning.hint()).toBeNull();
    expect(TestBed.inject(MeaningHintService).claim()).toBe(true);
  });
});
