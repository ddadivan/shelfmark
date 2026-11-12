import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_VARIANT, DialogService } from '@shelfmark/ui';
import { SEARCH_SHORTCUT_CODE } from '../models/search-shortcut-code.const';
import { SEARCH_SHORTCUT_KEY } from '../models/search-shortcut-key.const';
import { SearchDialogComponent } from '../components/search-dialog/search-dialog.component';

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
    this.dialogs.open(SearchDialogComponent, {
      variant: DIALOG_VARIANT.Command,
      autoFocus: SEARCH_FIELD,
    });
  }

  /**
   * Opens the dialog for Cmd or Ctrl + K and stops the browser's own use of the shortcut. It fires
   * in text fields on purpose: the shortcut is global, like the browser's own. On a Latin layout
   * the key is `k`; only when the key is not a Latin letter (Cyrillic, Greek, ...) the physical
   * key (`code`) decides. Key events without a `key` (autofill) and IME composition are ignored.
   * Returns whether the event was the shortcut.
   */
  handleShortcut(event: KeyboardEvent): boolean {
    if (typeof event.key !== 'string' || event.isComposing) {
      return false;
    }
    const key = event.key.toLowerCase();
    const latin = /^[a-z]$/u.test(key);
    const isKey = latin ? key === SEARCH_SHORTCUT_KEY : event.code === SEARCH_SHORTCUT_CODE;
    if (!isKey || event.altKey || event.shiftKey || !(event.metaKey || event.ctrlKey)) {
      return false;
    }
    event.preventDefault();
    this.open();
    return true;
  }
}
