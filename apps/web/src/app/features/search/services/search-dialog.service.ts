import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_VARIANT, DialogService } from '@shelfmark/ui';
import { ViewportService } from '../../../core/layout/viewport.service';
import { SearchFieldService } from './search-field.service';
import { matchesSearchShortcut } from '../utils/matches-search-shortcut';
import { SearchDialogComponent } from '../components/search-dialog/search-dialog.component';

/** Selector of the search field; it gets focus when the dialog opens. */
const SEARCH_FIELD = 'input[role="combobox"]';

/**
 * Starts a search from the Search tab, the top bar field and the Cmd or Ctrl + K shortcut: with
 * the desktop header (from 64em, Shelf) it focuses the header field, which filters the feed in
 * place; in the mobile shell (below 64em) it opens the full-screen search dialog. A desktop page
 * without the field (Settings) still gets the dialog.
 */
@Service()
export class SearchDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);
  private readonly viewport = inject(ViewportService);
  private readonly field = inject(SearchFieldService);

  /**
   * Focuses the header field from 64em, else opens the dialog; nothing happens while any
   * dialog is open (the search itself included).
   */
  open(): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    if (!this.viewport.compact() && this.field.focus()) {
      return;
    }
    this.dialogs.open(SearchDialogComponent, {
      variant: DIALOG_VARIANT.Command,
      autoFocus: SEARCH_FIELD,
    });
  }

  /**
   * Starts the search (`open()`) for Cmd or Ctrl + K (`matchesSearchShortcut`) and stops the
   * browser's own use of the shortcut. It fires in text fields on purpose: the shortcut is global,
   * like the browser's own.
   * Returns whether the event was the shortcut.
   */
  handleShortcut(event: KeyboardEvent): boolean {
    if (!matchesSearchShortcut(event)) {
      return false;
    }
    event.preventDefault();
    this.open();
    return true;
  }
}
