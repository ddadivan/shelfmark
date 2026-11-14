import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { isHexColour } from '@shelfmark/contracts';
import { TOAST_DURATION_MS, TOAST_KIND, ToastService, toastShortcutLabel } from '@shelfmark/ui';
import { UserSettingsStore } from '../../stores/user-settings.store';

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
  private readonly transloco = inject(TranslocoService);

  /** Forgets `colour` and says so with an Undo; a failed save puts it back and tells. */
  async remove(colour: string): Promise<void> {
    if (!isHexColour(colour)) {
      return;
    }
    if (!(await this.settings.removeCustomColour(colour))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('settings.appearance.custom.own.removeFailed'),
        detail: colour,
      });
      return;
    }
    const undo = this.t('settings.appearance.custom.own.undo');
    this.toasts.show({
      kind: TOAST_KIND.Info,
      title: this.t('settings.appearance.custom.own.removed'),
      detail: colour,
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.t('toast.actionHint', { shortcut: toastShortcutLabel(), action: undo }),
      action: { label: undo, run: () => void this.settings.addCustomColour(colour) },
    });
  }

  /** The accessible name of the remove action of one own swatch ("Remove colour #a33a5b"). */
  removeLabel(colour: string): string {
    return this.t('settings.appearance.custom.own.remove', { colour });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
