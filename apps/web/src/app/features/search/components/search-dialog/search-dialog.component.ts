import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  DialogComponent,
  KEYBOARD_KEY,
  SegmentedControlComponent,
  UiDialogRef,
  type SegmentedOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { AskComposerComponent } from '../../../ai/components/ask-composer/ask-composer.component';
import { AskConversationComponent } from '../../../ai/components/ask-conversation/ask-conversation.component';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { AskInbox } from '../../../ai/services/ask-inbox.service';
import { AskPanelService } from '../../../ai/services/ask-panel.service';
import { AskStore } from '../../../ai/services/ask.store';
import { SEARCH_MODE } from '../../models/search-mode.const';
import type { SearchMode } from '../../models/search-mode.type';
import { SearchResultsComponent } from '../search-results/search-results.component';

/**
 * The search dialog (Cmd or Ctrl + K below 80em, the Search tab on phones and tablets): the
 * shared results list (`app-search-results`) in a `ui-dialog`. The list finishing the search
 * (a link opened, a page chosen) closes it; Esc closes it from anywhere inside.
 *
 * In the mobile shell (below 64em) with Ask on, a Search · Ask segment switches to Ask your shelf
 * in the same dialog (MobileAiMore): composer on top, the conversation under it, kept while the
 * dialog is open. "Ask your shelf about this" switches with the query. With a header the Ask row
 * closes the dialog and opens the Ask panel instead.
 */
@Component({
  selector: 'app-search-dialog',
  imports: [
    TranslocoPipe,
    DialogComponent,
    SegmentedControlComponent,
    SearchResultsComponent,
    AskComposerComponent,
    AskConversationComponent,
  ],
  providers: [AskStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-dialog.component.html',
  styleUrl: './search-dialog.component.scss',
})
export class SearchDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly askPanel = inject(AskPanelService);
  private readonly inbox = inject(AskInbox);
  private readonly viewport = inject(ViewportService);
  private readonly ai = inject(AiSettingsStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly SEARCH_MODE = SEARCH_MODE;

  protected readonly mode = signal<SearchMode>(SEARCH_MODE.Search);
  /** The segment shows in the mobile shell while Ask is on. */
  protected readonly segmented = computed(() => this.viewport.compact() && this.ai.askOn());
  protected readonly asking = computed(() => this.segmented() && this.mode() === SEARCH_MODE.Ask);
  protected readonly options = computed<readonly SegmentedOption[]>(() => {
    activeLang();
    return [
      { value: SEARCH_MODE.Search, label: this.transloco.translate('search.mode.search') },
      { value: SEARCH_MODE.Ask, label: this.transloco.translate('search.mode.ask') },
    ];
  });

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
  }

  protected close(): void {
    this.ref.close();
  }

  protected setMode(value: string): void {
    this.mode.set(value === SEARCH_MODE.Ask ? SEARCH_MODE.Ask : SEARCH_MODE.Search);
  }

  /** The Ask row: the Ask segment here in the mobile shell, else the Ask panel. */
  protected ask(question: string): void {
    if (this.segmented()) {
      this.inbox.put(question);
      this.mode.set(SEARCH_MODE.Ask);
      return;
    }
    this.ref.close();
    this.askPanel.open(question);
  }
}
