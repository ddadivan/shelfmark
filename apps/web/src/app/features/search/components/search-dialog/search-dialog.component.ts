import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogComponent, KEYBOARD_KEY, UiDialogRef } from '@shelfmark/ui';
import { SearchResultsComponent } from '../search-results/search-results.component';

/**
 * The search dialog (Cmd or Ctrl + K below 80em, the Search tab on phones and tablets): the
 * shared results list (`app-search-results`) in a `ui-dialog`. The list finishing the search
 * (a link opened, a page chosen) closes it; Esc closes it from anywhere inside.
 */
@Component({
  selector: 'app-search-dialog',
  imports: [TranslocoPipe, DialogComponent, SearchResultsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-dialog.component.html',
})
export class SearchDialogComponent {
  private readonly ref = inject<UiDialogRef<undefined>>(UiDialogRef);

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
}
