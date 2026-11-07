import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CommandGroupComponent,
  CommandItemComponent,
  CommandListComponent,
  DialogComponent,
  FaviconComponent,
  HighlightComponent,
  IconComponent,
  KEYBOARD_KEY,
  type CommandSelection,
  UiDialogRef,
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
import { FoldersStore } from '../../../stores/folders.store';
import { TagsStore } from '../../../stores/tags.store';
import { APP_PATH } from '../../../models/app-path.const';
import { LinkActionsService } from '../../links/link-actions.service';
import { linkHost, safeHref, siteLetter } from '../../links/link-view';
import { LINKS_API } from '../../links/models/links-api.const';
import { SEARCH_QUERY_PARAM } from '../../links/models/search-query-param.const';
import { parseSearchQuery, splitQuery } from '../../links/search-query';
import { TAG_QUERY_PARAM } from '../../tags/models/tag-query-param.const';
import { SEARCH_DEBOUNCE_MS } from '../models/search-debounce-ms.const';
import { SEARCH_LINK_LIMIT } from '../models/search-link-limit.const';
import { SEARCH_RESULT_KIND } from '../models/search-result-kind.const';
import type { SearchState } from '../models/search-state.interface';
import { LinkOpener } from '../link-opener.service';
import { matchFolders, matchTags } from '../search-match';
import { isMacPlatform } from '../is-mac-platform';
import { pluralKey } from '../../../core/i18n/plural-key';

const IDLE: SearchState = { query: '', links: [], more: false, failed: false };

/**
 * The search dialog (Cmd or Ctrl + K). It owns its data: the typed text is debounced, a newer
 * text cancels the request in flight (`switchMap`) and the previous results stay on screen,
 * marked busy, until the new ones arrive. Links come from the API (title, note and URL); folders
 * and tags are matched in the lists the app already holds.
 *
 * Enter opens a link in a new tab and closes the dialog; Cmd or Ctrl + Enter opens it in the
 * background and keeps the dialog. A folder or a tag opens its page, "Show all results" the
 * library page with the query.
 */
@Component({
  selector: 'app-search-dialog',
  imports: [
    TranslocoPipe,
    CommandGroupComponent,
    CommandItemComponent,
    CommandListComponent,
    DialogComponent,
    FaviconComponent,
    HighlightComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-dialog.component.html',
  styleUrl: './search-dialog.component.scss',
})
export class SearchDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly api = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  private readonly actions = inject(LinkActionsService);
  private readonly router = inject(Router);
  private readonly opener = inject(LinkOpener);

  protected readonly SEARCH_RESULT_KIND = SEARCH_RESULT_KIND;
  protected readonly pluralKey = pluralKey;
  protected readonly linkHost = linkHost;
  protected readonly siteLetter = siteLetter;
  protected readonly mac = isMacPlatform();

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
  /** Everything listed: links, folders and tags. */
  protected readonly resultCount = computed(
    () => this.linkCount() + this.folderMatches().length + this.tagMatches().length,
  );
  /** The results on screen are final for a query: the status region may announce them. */
  protected readonly settled = computed(() => this.parsed() !== '' && !this.busy());

  constructor() {
    // The combobox consumes Esc (`defaultPrevented`, maybe more), which the dialog service then
    // ignores: close on the way down, before the combobox sees the key.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === KEYBOARD_KEY.Escape) {
        event.preventDefault();
        this.close();
      }
    };
    host.addEventListener('keydown', onKeydown, true);
    inject(DestroyRef).onDestroy(() => host.removeEventListener('keydown', onKeydown, true));
    // Folders and tags are shared with the sidebar; the calls are no-ops once loaded.
    void this.folders.load();
    void this.tags.load();
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
        this.openLink(id, selection.background);
        break;
      case SEARCH_RESULT_KIND.Folder:
        void this.go([`/${APP_PATH.Folders}`, id], {});
        break;
      case SEARCH_RESULT_KIND.Tag:
        void this.go([`/${APP_PATH.Links}`], { [TAG_QUERY_PARAM]: id });
        break;
      case SEARCH_RESULT_KIND.All:
        void this.go([`/${APP_PATH.Links}`], { [SEARCH_QUERY_PARAM]: this.state().query });
        break;
      default:
        break;
    }
  }

  protected close(): void {
    this.ref.close();
  }

  private openLink(id: string, background: boolean): void {
    const link = this.state().links.find((candidate) => candidate.id === id);
    const href = link ? safeHref(link.url) : undefined;
    if (!link || href === undefined) {
      return;
    }
    this.actions.open(link);
    this.opener.open(href, background);
    if (!background) {
      this.ref.close();
    }
  }

  /** Navigates first; the dialog closes only when the navigation went through. */
  private async go(commands: string[], queryParams: Record<string, string>): Promise<void> {
    if (await this.router.navigate(commands, { queryParams })) {
      this.ref.close();
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
