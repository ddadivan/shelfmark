import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogComponent, KEYBOARD_KEY, UiDialogRef } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { AskInbox } from '../../../ai/services/ask-inbox.service';
import { AskPanelService } from '../../../ai/services/ask-panel.service';
import { SearchResultsComponent } from '../search-results/search-results.component';

/**
 * The search dialog (Cmd or Ctrl + K below 80em, the Search tab on phones and tablets): the
 * shared results list (`app-search-results`) in a `ui-dialog`. The list finishing the search
 * (a link opened, a page chosen) closes it; Esc closes it from anywhere inside.
 *
 * The Ask row ("Ask your shelf about this") closes the dialog and hands the query to Ask: the
 * full-screen Ask page in the mobile shell (the Ask tab, `MobileAiMore` 1–2), the Ask panel with
 * a header. Ask has its own tab on the phone, so the dialog has no Search · Ask segment (#499).
 */
@Component({
  selector: 'app-search-dialog',
  imports: [TranslocoPipe, DialogComponent, SearchResultsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-dialog.component.html',
})
export class SearchDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);
  private readonly askPanel = inject(AskPanelService);
  private readonly inbox = inject(AskInbox);
  private readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);

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
    if (this.viewport.compact()) {
      this.inbox.put(question);
      await this.router.navigateByUrl(`/${APP_PATH.Ask}`);
      return;
    }
    this.askPanel.open(question);
  }
}
