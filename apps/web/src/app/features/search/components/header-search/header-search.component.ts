import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ButtonComponent,
  CommandGroupComponent,
  CommandItemComponent,
  ChipComponent,
  CommandListComponent,
  FolderIconComponent,
  ICON_NAMES,
  ICON_SIZE,
  IconComponent,
  isMacPlatform,
  KEYBOARD_KEY,
  type CommandSelection,
} from '@shelfmark/ui';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { FEED_ITEM_FOCUS_SELECTOR } from '../../../library/models/feed-item-focus-selector.const';
import { FeedSearchService } from '../../services/feed-search.service';
import { RecentSearchesService } from '../../services/recent-searches.service';
import { SearchFieldService } from '../../services/search-field.service';

/**
 * The search field of the desktop header (Shelf, from 64em, `03-search.html`): typing filters the
 * library feed in place (`FeedSearchService`, `?q=`), so the field has no results panel. Focus in
 * the empty field opens "Recent searches" (`ui-command-list` popup with `emptyPanel`) and, while
 * Ask is on, the hint that questions belong to Ask. Enter moves to the first result, Esc clears
 * the text; the text is remembered as a recent search on Enter and when the field is left. The
 * field registers with `SearchFieldService`, which is how Cmd or Ctrl + K focuses it.
 */
@Component({
  selector: 'app-header-search',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ChipComponent,
    CommandGroupComponent,
    CommandItemComponent,
    CommandListComponent,
    FolderIconComponent,
    IconComponent,
  ],
  host: { '(focusin)': 'focused.set(true)', '(focusout)': 'onFocusout($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header-search.component.html',
  styleUrl: './header-search.component.scss',
})
export class HeaderSearchComponent {
  protected readonly search = inject(FeedSearchService);
  protected readonly recent = inject(RecentSearchesService);
  protected readonly ai = inject(AiSettingsStore);
  /** Shortcut hint at the end of the field (the key is Cmd on Apple devices, else Ctrl). */
  protected readonly shortcut = isMacPlatform() ? '⌘K' : 'Ctrl K';

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly scope = this.search.scope;
  /** Focus is somewhere in the field (its input, the chip, the list). */
  protected readonly focused = signal(false);
  /**
   * The scope chip shows only while searching (author, Nov 27): with focus in the field or text in
   * it. At rest the placeholder ("Search in Work") already says where a search would look.
   */
  protected readonly showScope = computed(
    () => this.scope() !== null && (this.focused() || this.search.text() !== ''),
  );

  private readonly transloco = inject(TranslocoService);
  // Re-reads the scope name when the language changes or its file arrives.
  private readonly lang = toSignal(this.transloco.langChanges$);
  /** The name of the scope in the chip: the folder's name or the translated "Unsorted". */
  protected readonly scopeName = computed(() => {
    this.lang();
    const scope = this.scope();
    return scope?.name ?? (scope?.labelKey ? this.transloco.translate(scope.labelKey) : '');
  });
  protected readonly scopeIcon = computed(() => {
    const icon = this.scope()?.icon;
    return ICON_NAMES.find((name) => name === icon) ?? 'folder';
  });
  /** Placeholder and accessible name of the field: "Search in Work" while scoped. */
  protected readonly placeholder = computed(() => {
    this.lang();
    const name = this.scopeName();
    return this.transloco.translate(name === '' ? 'search.placeholder' : 'search.placeholderIn', {
      scope: name,
    });
  });

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly list = viewChild.required(CommandListComponent);

  constructor() {
    const unregister = inject(SearchFieldService).register(() => {
      this.list().focus();
      return true;
    });
    inject(DestroyRef).onDestroy(unregister);
  }

  /** A recent search was chosen: it becomes the search. */
  protected choose(selection: CommandSelection): void {
    this.search.setText(selection.value);
    this.recent.add(selection.value);
    void this.search.flush();
  }

  /** The chip's ×: the same text in All links; focus stays in the field. */
  protected async searchEverywhere(): Promise<void> {
    await this.search.searchEverywhere();
    this.list().focus();
  }

  protected async clear(): Promise<void> {
    await this.search.clear();
    this.list().focus();
  }

  /** Enter with text: search now and move to the first result of the feed. */
  protected async onKeydown(event: KeyboardEvent): Promise<void> {
    if (event.key !== KEYBOARD_KEY.Enter || event.isComposing || this.search.text().trim() === '') {
      return;
    }
    event.preventDefault();
    this.recent.add(this.search.text());
    await this.search.flush();
    // The feed renders the answer a moment later; focus its first link once it is there.
    setTimeout(() => {
      this.document.querySelector<HTMLElement>(FEED_ITEM_FOCUS_SELECTOR)?.focus();
    });
  }

  /** Leaving the field keeps its text as a recent search. */
  protected onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.contains(next)) {
      return;
    }
    this.focused.set(false);
    this.recent.add(this.search.text());
  }
}
