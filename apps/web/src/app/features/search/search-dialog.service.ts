import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { SEARCH_SHORTCUT_CODE } from './models/search-shortcut-code.const';
import { SEARCH_SHORTCUT_KEY } from './models/search-shortcut-key.const';
import { SearchDialogComponent } from './search-dialog/search-dialog.component';

/** Selector of the search field; it gets focus when the dialog opens. */
const SEARCH_FIELD = 'input[role="combobox"]';

/** Opens the search dialog from the header button and from the Cmd or Ctrl + K shortcut. */
@Service()
export class SearchDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);

  /** Opens the dialog; nothing happens while any dialog is open (the search itself included). */
  open(): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    this.dialogs.open(SearchDialogComponent, { size: DIALOG_SIZE.Md, autoFocus: SEARCH_FIELD });
  }

  /**
   * Opens the dialog for Cmd or Ctrl + K and stops the browser's own use of the shortcut.
   * The key is matched by `code` (layout independent) with `key` as the fallback. Returns whether
   * the event was the shortcut.
   */
  handleShortcut(event: KeyboardEvent): boolean {
    const isKey =
      event.code === SEARCH_SHORTCUT_CODE || event.key.toLowerCase() === SEARCH_SHORTCUT_KEY;
    if (!isKey || event.altKey || event.shiftKey || !(event.metaKey || event.ctrlKey)) {
      return false;
    }
    event.preventDefault();
    this.open();
    return true;
  }
}
