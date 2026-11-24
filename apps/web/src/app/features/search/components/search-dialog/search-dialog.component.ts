import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogComponent, KEYBOARD_KEY, UiDialogRef } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { SearchAskService } from '../../services/search-ask.service';
import { SearchResultsComponent } from '../search-results/search-results.component';

/**
 * The search dialog: in the mobile shell (below 64em: the Search tab, the top bar field, Cmd or
 * Ctrl + K) the Shelf full-screen search (`screen`: a page with Back and the field); from 64em only
 * where the header has no field (Settings), as the command dialog. The results list
 * (`app-search-results`) finishing the search (a link opened, a page chosen) closes it; Esc closes
 * it from anywhere inside.
 *
 * The Ask row ("Ask your shelf about this") closes the dialog and hands the query to Ask
 * (`SearchAskService`): the full-screen Ask page in the mobile shell, the Ask panel with a header.
 */
@Component({
  selector: 'app-search-dialog',
  imports: [TranslocoPipe, DialogComponent, SearchResultsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-dialog.component.html',
})
export class SearchDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly asker = inject(SearchAskService);
  /** The mobile shell: the full-screen search. */
  protected readonly compact = inject(ViewportService).compact;

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

  /** The Ask row: the full-screen Ask page in the mobile shell, else the Ask panel. */
  protected async ask(question: string): Promise<void> {
    this.ref.close();
    await this.asker.ask(question);
  }
}
