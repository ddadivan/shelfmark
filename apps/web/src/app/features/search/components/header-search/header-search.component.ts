import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  CommandGroupComponent,
  CommandItemComponent,
  CommandListComponent,
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
    CommandGroupComponent,
    CommandItemComponent,
    CommandListComponent,
    IconComponent,
  ],
  host: { '(focusout)': 'onFocusout($event)' },
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
    this.recent.add(this.search.text());
  }
}
