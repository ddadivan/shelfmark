import { inject, Service } from '@angular/core';
import {
  PIN_KIND,
  PIN_LIMIT,
  type FolderResponse,
  type LinkResponse,
  type PinKind,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { TOAST_DURATION_MS, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { PinsStore } from '../../../stores/pins.store';
import { PIN_OUTCOME } from '../models/pin-outcome.const';
import type { PinRow } from '../models/pin-row.interface';
import { Translate } from '../../../core/i18n/translate.service';
import { UndoToastService } from '../../../core/undo/undo-toast.service';

/**
 * What a user can do with the sidebar pins: pin and unpin a folder or link (a row of the Pinned
 * section unpins with Undo), move an item in the Pinned section. Texts and toasts live here, so components only call. The eighth pin is refused
 * with a toast that names the limit.
 */
@Service()
export class PinActionsService {
  private readonly pins = inject(PinsStore);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(Translate);
  private readonly undoToast = inject(UndoToastService);

  pinFolder(folder: FolderResponse): Promise<void> {
    return this.pin(PIN_KIND.Folder, folder.id, folder.name);
  }

  pinLink(link: LinkResponse): Promise<void> {
    return this.pin(PIN_KIND.Link, link.id, link.title);
  }

  pinView(view: SavedViewResponse): Promise<void> {
    return this.pin(PIN_KIND.View, view.id, view.name);
  }

  unpinView(view: SavedViewResponse): Promise<void> {
    return this.unpin(PIN_KIND.View, view.id, view.name);
  }

  unpinFolder(folder: FolderResponse): Promise<void> {
    return this.unpin(PIN_KIND.Folder, folder.id, folder.name);
  }

  unpinLink(link: LinkResponse): Promise<void> {
    return this.unpin(PIN_KIND.Link, link.id, link.title);
  }

  /**
   * Unpins a row of the Pinned section (its "Unpin" button or menu item) with an Undo toast; Undo
   * pins it again at the place it had.
   */
  async unpinRow(row: PinRow): Promise<void> {
    const index = this.pins.rows().findIndex((item) => item.key === row.key);
    const name = row.folder?.name ?? row.link?.title ?? row.view?.name ?? '';
    if (!(await this.pins.unpin({ kind: row.kind, id: row.id }))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('pins.unpinFailed.title'),
        detail: name,
      });
      return;
    }
    const undo = this.translate.t('links.item.undo');
    this.undoToast.show({
      kind: TOAST_KIND.Success,
      title: this.translate.t('pins.unpinned.title'),
      detail: name,
      actionLabel: undo,
      onUndo: () => void this.restore(row, index, name),
    });
  }

  /** Moves the pinned item at `from` to `to` (a drag, or "Move up" / "Move down"). */
  async move(from: number, to: number): Promise<void> {
    const item = this.pins.rows()[from];
    if (!item || from === to) {
      return;
    }
    if (!(await this.pins.move({ kind: item.kind, id: item.id }, to))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('pins.moveFailed.title'),
        detail: this.translate.t('pins.moveFailed.detail'),
      });
    }
  }

  /** Undo of `unpinRow`: pinned again (at the end), then put back at `index`. */
  private async restore(row: PinRow, index: number, name: string): Promise<void> {
    await this.pin(row.kind, row.id, name);
    if (index >= 0 && this.pins.has(row.kind, row.id)) {
      await this.pins.move({ kind: row.kind, id: row.id }, index);
    }
  }

  private async pin(kind: PinKind, id: string, name: string) {
    const outcome = await this.pins.pin({ kind, id });
    if (outcome === PIN_OUTCOME.Limit) {
      this.toasts.show({
        kind: TOAST_KIND.Warn,
        title: this.translate.t('pins.limit.title'),
        detail: this.translate.t('pins.limit.detail', { max: String(PIN_LIMIT.Max) }),
        duration: TOAST_DURATION_MS.Limit,
      });
    } else if (outcome === PIN_OUTCOME.Failed) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('pins.pinFailed.title'),
        detail: name,
      });
    }
  }

  private async unpin(kind: PinKind, id: string, name: string): Promise<void> {
    if (!(await this.pins.unpin({ kind, id }))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('pins.unpinFailed.title'),
        detail: name,
      });
    }
  }
}
