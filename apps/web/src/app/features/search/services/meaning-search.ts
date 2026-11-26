import { computed, effect, inject, Injector, Service, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AI_SEARCH_LIMIT,
  AI_SEARCH_STATE,
  type LinkResponse,
  type MeaningSearchResponse,
} from '@shelfmark/contracts';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import { LocaleService } from '../../../core/i18n/locale.service';
import { LinksStore } from '../../../stores/links.store';
import { AI_API } from '../../ai/models/ai-api.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { MEANING_DEBOUNCE_MS } from '../models/meaning-debounce-ms.const';
import type { MeaningHint } from '../models/meaning-hint.interface';
import type { MeaningRow } from '../models/meaning-row.interface';
import type { MeaningSearchState } from '../models/meaning-search-state.interface';
import type { MeaningSource } from '../models/meaning-source.interface';
import { meaningWhy } from '../utils/meaning-why';
import { MeaningHintService } from './meaning-hint.service';

const IDLE: MeaningSearchState = { query: '', items: [], status: null, waiting: false };

/**
 * Meaning matches for the search (AI-3, scoped to `app-search-results`). It asks
 * `GET /api/ai/search` only once the word answer for the text has settled and the text stayed the
 * same another `MEANING_DEBOUNCE_MS`, while "Search by meaning" is on and the text has at least
 * `AI_SEARCH_LIMIT.QueryMinChars` characters; a newer query cancels the call in flight; a failure is
 * "no meaning results". Nothing shows while the switch is off, and only for the word answer on
 * screen; links already among the word matches are left out. The words never wait for this.
 */
@Service({ autoProvided: false })
export class MeaningSearch {
  private readonly store = inject(AiSettingsStore);
  private readonly injector = inject(Injector);
  private readonly hints = inject(MeaningHintService);
  private readonly locale = inject(LocaleService);
  private readonly links = inject(LinksStore);
  /** What the links store changed since the answer came: a new state, or `null` for a hidden link. */
  private readonly changed = signal<ReadonlyMap<string, LinkResponse | null>>(new Map());
  private readonly source = signal<MeaningSource | null>(null);

  private readonly trigger = computed(() => {
    const source = this.source();
    return {
      on: this.store.meaningSearchOn(),
      text: source?.text() ?? '',
      settled: source?.words().query ?? '',
    };
  });

  private readonly state = toSignal(
    toObservable(this.trigger).pipe(
      debounceTime(MEANING_DEBOUNCE_MS),
      // While the text runs ahead of the word answer, nothing changes (and the timer restarts).
      filter((trigger) => trigger.text === trigger.settled),
      map((trigger) => (trigger.on ? trigger.settled : '')),
      distinctUntilChanged(),
      switchMap((query) => this.search(query)),
    ),
    { initialValue: IDLE },
  );

  /** The answer belongs to the word answer on screen and the switch is on. */
  private readonly current = computed(() => {
    const words = this.source()?.words();
    const state = this.state();
    return words !== undefined &&
      this.store.meaningSearchOn() &&
      state.query !== '' &&
      state.query === words.query
      ? state
      : null;
  });

  /** The "Related by meaning" rows, best first, without the word matches. */
  readonly rows = computed<MeaningRow[]>(() => {
    const state = this.current();
    if (state === null) {
      return [];
    }
    const wordIds = new Set(
      this.source()
        ?.words()
        .links.map((link) => link.id),
    );
    const changed = this.changed();
    return state.items
      .filter((match) => !wordIds.has(match.link.id) && changed.get(match.link.id) !== null)
      .map((match) => ({
        link: changed.get(match.link.id) ?? match.link,
        why: meaningWhy(match.why),
      }));
  });

  /** The query whose answer claimed the once-per-session "getting ready" line. */
  private readonly hintFor = signal<string | null>(null);

  /** "Getting ready: {ready} of {total} links", once per session, or `null`. */
  readonly hint = computed<MeaningHint | null>(() => {
    const state = this.current();
    return state?.waiting && state.status && this.hintFor() === state.query
      ? {
          ready: this.locale.formatNumber(state.status.ready),
          total: this.locale.formatNumber(state.status.total),
        }
      : null;
  });

  /** Meaning matches for the settled word answer are still on their way. */
  readonly pending = computed(() => {
    const source = this.source();
    if (source === null || !this.store.meaningSearchOn()) {
      return false;
    }
    const query = source.words().query;
    return (
      query.length >= AI_SEARCH_LIMIT.QueryMinChars &&
      source.text() === query &&
      this.state().query !== query
    );
  });

  constructor() {
    // The cards are not part of the feed: a star, an edit, a delete (and its Undo) of one of them
    // goes through the links store, and the card follows it.
    this.links.linkChanges.pipe(takeUntilDestroyed()).subscribe((change) => {
      if (!change.upserted?.length && !change.removed?.length) {
        return;
      }
      const next = new Map(this.changed());
      for (const link of change.upserted ?? []) {
        next.set(link.id, link);
      }
      for (const id of change.removed ?? []) {
        next.set(id, null);
      }
      this.changed.set(next);
    });
    // The line is claimed only when an answer that may show it is the one on screen (`current`),
    // so an answer dropped by a newer query or a closed dialog does not use up the session's line.
    effect(() => {
      const state = this.current();
      if (
        state?.waiting === true &&
        state.status !== null &&
        untracked(this.hintFor) === null &&
        untracked(() => this.hints.claim())
      ) {
        this.hintFor.set(state.query);
      }
    });
  }

  /** Follows the text and the word answer of one search field. */
  connect(source: MeaningSource): void {
    this.source.set(source);
  }

  private search(query: string): Observable<MeaningSearchState> {
    if (query.length < AI_SEARCH_LIMIT.QueryMinChars) {
      return of({ ...IDLE, query });
    }
    return this.injector
      .get(AI_API)
      .searchMeaning(query.slice(0, AI_SEARCH_LIMIT.QueryMax), AI_SEARCH_LIMIT.MeaningDefault)
      .pipe(
        tap((response) => this.store.searchStatusSeen(response.status)),
        map((response) => this.settle(query, response)),
        catchError(() => of({ ...IDLE, query })),
      );
  }

  private settle(query: string, response: MeaningSearchResponse): MeaningSearchState {
    const state = response.status.state;
    return {
      query,
      items: state === AI_SEARCH_STATE.Ready ? response.items : [],
      status: response.status,
      waiting: state === AI_SEARCH_STATE.Processing || state === AI_SEARCH_STATE.Quota,
    };
  }
}
