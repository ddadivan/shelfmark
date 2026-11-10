import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { UiStore } from '../../stores/ui.store';
import { isEditableTarget } from './is-editable-target';
import { SHORTCUTS_HELP_KEY } from './models/shortcuts-help-key.const';
import { ShortcutsDialogComponent } from './shortcuts-dialog/shortcuts-dialog.component';

/** Opens the keyboard shortcuts list from the top bar button, the "?" key and the settings page. */
@Service()
export class ShortcutsDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);
  private readonly ui = inject(UiStore);

  /** Opens the dialog; nothing happens while any dialog is open (this one included). */
  open(): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    this.dialogs.open(ShortcutsDialogComponent, { size: DIALOG_SIZE.Md });
  }

  /**
   * Opens the dialog for "?" (Shift and "/" on most layouts). Ignored while typing in a field,
   * with Ctrl, Cmd or Alt, while composing text, when something already handled the key and when
   * the person turned single-key shortcuts off (WCAG 2.1.4; the top bar button still works).
   * Returns whether it was the shortcut.
   */
  handleShortcut(event: KeyboardEvent): boolean {
    if (
      !this.ui.singleKeyShortcuts() ||
      event.defaultPrevented ||
      event.isComposing ||
      event.key !== SHORTCUTS_HELP_KEY ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isEditableTarget(event.target)
    ) {
      return false;
    }
    event.preventDefault();
    this.open();
    return true;
  }
}
