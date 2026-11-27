import { inject, Service } from '@angular/core';
import { isHexColour } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { Translate } from '../i18n/translate.service';
import { UndoToastService } from '../undo/undo-toast.service';

/**
 * Removing an own colour (#350) from the places that show them as swatches (the folder style
 * dialog, the Custom theme accent and background): the swatch goes at once and is dropped from the
 * saved `customColours`, a toast offers Undo. A folder or theme that wears the colour keeps it:
 * only the swatch is forgotten.
 */
@Service()
export class OwnColourActionsService {
  private readonly settings = inject(UserSettingsStore);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(Translate);
  private readonly undoToast = inject(UndoToastService);

  /** Forgets `colour` and says so with an Undo; a failed save puts it back and tells. */
  async remove(colour: string): Promise<void> {
    if (!isHexColour(colour)) {
      return;
    }
    if (!(await this.settings.removeCustomColour(colour))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('settings.appearance.custom.own.removeFailed'),
        detail: colour,
      });
      return;
    }
    const undo = this.translate.t('settings.appearance.custom.own.undo');
    this.undoToast.show({
      kind: TOAST_KIND.Info,
      title: this.translate.t('settings.appearance.custom.own.removed'),
      detail: colour,
      actionLabel: undo,
      onUndo: () => void this.settings.addCustomColour(colour),
    });
  }

  /** The accessible name of the remove action of one own swatch ("Remove colour #a33a5b"). */
  removeLabel(colour: string): string {
    return this.translate.t('settings.appearance.custom.own.remove', { colour });
  }
}
