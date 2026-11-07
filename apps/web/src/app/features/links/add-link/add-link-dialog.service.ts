import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import type { AddLinkData } from '../models/add-link-data.interface';
import type { AddLinkDialogData } from '../models/add-link-dialog-data.interface';
import type { AddLinkResult } from '../models/add-link-result.type';
import type { AddLinkSession } from '../models/add-link-session.interface';
import { AddLinkDialogComponent } from './add-link-dialog.component';

/**
 * Opens the add-link dialog; features call `inject(AddLinkDialogService).open({ folderId })`.
 * Resolves with the saved link, the "open existing" choice (the caller navigates), or
 * `undefined` when the dialog was dismissed.
 *
 * `ui-dialog` has no close guard, so while a save runs Cancel is disabled but Esc, the scrim
 * and the close button still dismiss the dialog. The save then finishes anyway and the caller
 * still receives the saved link (`undefined` only when the save failed).
 */
@Service()
export class AddLinkDialogService {
  private readonly dialogs = inject(DialogService);

  open(data: AddLinkData = {}): Promise<AddLinkResult | undefined> {
    // One key per dialog session (create mode only); a new dialog always starts with a new key.
    const session: AddLinkSession = {
      saving: null,
      idempotencyKey: data.link === undefined ? globalThis.crypto.randomUUID() : null,
      sentFingerprint: null,
    };
    return this.dialogs
      .open<AddLinkDialogComponent, AddLinkResult, AddLinkDialogData>(AddLinkDialogComponent, {
        size: DIALOG_SIZE.Md,
        data: { ...data, session },
      })
      .result.then((result) => result ?? session.saving ?? undefined);
  }
}
