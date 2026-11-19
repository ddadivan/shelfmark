import {
  ChangeDetectionStrategy,
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AiLineComponent,
  CommandGroupComponent,
  CommandItemComponent,
  CommandListComponent,
  FaviconComponent,
  HighlightComponent,
  ICON_SIZE,
  IconComponent,
  KEYBOARD_KEY,
  type CommandSelection,
} from '@shelfmark/ui';
import {
  catchError,
  debounce,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  timer,
  type Observable,
} from 'rxjs';
import { FoldersStore } from '../../../../stores/folders.store';
import { TagsStore } from '../../../../stores/tags.store';
import { APP_PATH } from '../../../../models/app-path.const';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { linkHost, safeHref, siteLetter } from '../../../links/utils/link-view';
import { LINKS_API } from '../../../links/models/links-api.const';
import { SEARCH_QUERY_PARAM } from '../../../links/models/search-query-param.const';
import { parseSearchQuery, splitQuery } from '../../../links/utils/search-query';
import { TAG_QUERY_PARAM } from '../../../tags/models/tag-query-param.const';
import { SEARCH_DEBOUNCE_MS } from '../../models/search-debounce-ms.const';
import { SEARCH_LINK_LIMIT } from '../../models/search-link-limit.const';
import { SEARCH_RESULT_KIND } from '../../models/search-result-kind.const';
import type { SearchState } from '../../models/search-state.interface';
import { LinkOpener } from '../../services/link-opener.service';
import { MeaningSearch } from '../../services/meaning-search';
import { BackfillReminderComponent } from '../backfill-reminder/backfill-reminder.component';
import { matchFolders, matchTags } from '../../utils/search-match';
import { isMacPlatform } from '../../utils/is-mac-platform';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { ASK_LIMIT } from '@shelfmark/contracts';

const IDLE: SearchState = { query: '', links: [], more: false, failed: false };

/**
 * The search core and its results list, shared by the two shells: the dialog (Cmd or Ctrl + K on
 * narrower screens, the phone and tablet search) and the header field with a results panel (from
 * 80em, `popup`). It owns its data: the typed text is debounced, a newer text cancels the request
 * in flight (`switchMap`) and the previous results stay on screen, marked busy, until the new ones
 * arrive. Links come from the API (title, note and URL); folders and tags are matched in the lists
 * the app already holds.
 *
 * Enter opens a link in a new tab and finishes the search (`done`); Cmd or Ctrl + Enter opens it
 * in the background and keeps the list. A folder or a tag opens its page, "Show all results" the
 * library page with the query. Meaning matches (AI-3, `MeaningSearch`) follow the word matches
 * under "Related by meaning" and open like links. In `popup` mode the finished search also clears the field after
 * a navigation (a link opened in a new tab leaves the text, so it can be searched again).
 */
@Component({
  selector: 'app-search-results',
  imports: [
    TranslocoPipe,
    AiLineComponent,
    BackfillReminderComponent,
    CommandGroupComponent,
    CommandItemComponent,
    CommandListComponent,
    FaviconComponent,
    HighlightComponent,
    IconComponent,
  ],
  providers: [MeaningSearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  /** The header field with a results panel instead of the list of a dialog. */
  readonly popup = input(false, { transform: booleanAttribute });
  /** The search is finished (a link opened, a page chosen): the dialog closes. */
  readonly done = output<void>();
  /** "Ask your shelf" with the query (AI-4): the shell hands it to Ask. */
  readonly ask = output<string>();

  private readonly list = viewChild.required(CommandListComponent);
  private readonly reminder = viewChild(BackfillReminderComponent);
  private readonly api = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  private readonly actions = inject(LinkActionsService);
  private readonly router = inject(Router);
  private readonly opener = inject(LinkOpener);
  /** Meaning matches after the word matches (AI-3); nothing while search by meaning is off. */
  protected readonly meaning = inject(MeaningSearch);
  /** The last row asks the query (AI-4): Ask on and at least `ASK_LIMIT.QuestionMin` characters. */
  protected readonly askRow = computed(
    () => this.ai.askOn() && this.query().trim().length >= ASK_LIMIT.QuestionMin,
  );
  private readonly ai = inject(AiSettingsStore);
  /** The mobile shell: the Ask row reads "Ask your shelf about this" and opens the Ask segment. */
  protected readonly compact = inject(ViewportService).compact;

  protected readonly SEARCH_RESULT_KIND = SEARCH_RESULT_KIND;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;
  protected readonly linkHost = linkHost;
  protected readonly siteLetter = siteLetter;
  protected readonly mac = isMacPlatform();
  /** Shortcut cap of the header field (the key is Cmd on Apple devices, else Ctrl). */
  protected readonly shortcut = this.mac ? '⌘K' : 'Ctrl K';

  /** The text in the input, as typed. */
  protected readonly query = signal('');
  /** The search text the results are for: normalized, cut like the API does. */
  protected readonly parsed = computed(() => parseSearchQuery(this.query()));

  /** The last settled answer of the API; the previous one stays while a new one loads. */
  protected readonly state = toSignal(
    toObservable(this.parsed).pipe(
      debounce((query) => timer(query === '' ? 0 : SEARCH_DEBOUNCE_MS)),
      distinctUntilChanged(),
      switchMap((query) => this.search(query)),
    ),
    { initialValue: IDLE },
  );
  /** The shown results lag behind the text (debounce or request in flight). */
  protected readonly busy = computed(() => this.parsed() !== this.state().query);

  protected readonly folderMatches = computed(() => {
    const query = this.parsed();
    return query === ''
      ? []
      : matchFolders(this.folders.entities(), (id) => this.folders.pathTo(id), query);
  });
  protected readonly tagMatches = computed(() => {
    const query = this.parsed();
    return query === '' ? [] : matchTags(this.tags.entities(), query);
  });
  protected readonly hasLocal = computed(
    () => this.folderMatches().length > 0 || this.tagMatches().length > 0,
  );
  protected readonly linkCount = computed(() => this.state().links.length);
  /** Everything listed: links, meaning matches, folders and tags. */
  protected readonly resultCount = computed(
    () =>
      this.linkCount() +
      this.meaning.rows().length +
      this.folderMatches().length +
      this.tagMatches().length,
  );
  /** The results on screen are final for a query: the status region may announce them. */
  protected readonly settled = computed(
    () => this.parsed() !== '' && !this.busy() && !this.meaning.pending(),
  );

  constructor() {
    // Folders and tags are shared with the sidebar; the calls are no-ops once loaded.
    void this.folders.load();
    void this.tags.load();
    this.meaning.connect({ text: this.parsed, words: this.state });
  }

  protected folderName(id: string | null): string | undefined {
    return id === null ? undefined : this.folders.entityMap()[id]?.name;
  }

  /**
   * The note, when it is part of why the link matched: the title alone does not have every word
   * and the note has at least one. Judged against the query the shown results were fetched for
   * (`state().query`), not the text being typed.
   */
  protected noteMatch(link: SearchState['links'][number]): string | null {
    if (link.note === null) {
      return null;
    }
    const words = splitQuery(this.state().query).map((word) => word.toLowerCase());
    const title = link.title.toLowerCase();
    const note = link.note.toLowerCase();
    const titleHasAll = words.every((word) => title.includes(word));
    return !titleHasAll && words.some((word) => note.includes(word)) ? link.note : null;
  }

  protected choose(selection: CommandSelection): void {
    const separator = selection.value.indexOf(':');
    const kind = separator < 0 ? selection.value : selection.value.slice(0, separator);
    const id = separator < 0 ? '' : selection.value.slice(separator + 1);
    switch (kind) {
      case SEARCH_RESULT_KIND.Link:
      case SEARCH_RESULT_KIND.Meaning:
        this.openLink(id, selection.background);
        break;
      case SEARCH_RESULT_KIND.Folder:
        void this.go([`/${APP_PATH.Folders}`, id], {});
        break;
      case SEARCH_RESULT_KIND.Tag:
        void this.go([`/${APP_PATH.Links}`], { [TAG_QUERY_PARAM]: id });
        break;
      case SEARCH_RESULT_KIND.Ask:
        this.ask.emit(this.query().trim());
        if (this.popup()) {
          this.query.set('');
        }
        break;
      case SEARCH_RESULT_KIND.All:
        void this.go([`/${APP_PATH.Links}`], { [SEARCH_QUERY_PARAM]: this.state().query });
        break;
      default:
        break;
    }
  }

  /**
   * The header panel lives in an overlay away from the field, so Tab would skip it: Tab in the
   * field moves to the reminder's buttons while they show (the dialog keeps the natural order).
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (
      this.popup() &&
      event.key === KEYBOARD_KEY.Tab &&
      !event.shiftKey &&
      event.target instanceof HTMLInputElement &&
      this.reminder()?.focusFirst()
    ) {
      event.preventDefault();
    }
  }

  /** Focuses the search field. */
  focus(options?: FocusOptions): void {
    this.list().focus(options);
  }

  private openLink(id: string, background: boolean): void {
    const link =
      this.state().links.find((candidate) => candidate.id === id) ??
      this.meaning.rows().find((row) => row.link.id === id)?.link;
    const href = link ? safeHref(link.url) : undefined;
    if (!link || href === undefined) {
      return;
    }
    this.actions.open(link);
    this.opener.open(href, background);
    if (!background) {
      this.done.emit();
    }
  }

  /** Navigates first; the search finishes only when the navigation went through. */
  private async go(commands: string[], queryParams: Record<string, string>): Promise<void> {
    if (await this.router.navigate(commands, { queryParams })) {
      if (this.popup()) {
        this.query.set('');
      }
      this.done.emit();
    }
  }

  private search(query: string): Observable<SearchState> {
    if (query === '') {
      return of(IDLE);
    }
    return this.api.list({ q: query, limit: SEARCH_LINK_LIMIT }).pipe(
      map((page) => ({
        query,
        links: page.items,
        more: page.nextCursor !== null,
        failed: false,
      })),
      catchError(() => of({ query, links: [], more: false, failed: true })),
    );
  }
}
