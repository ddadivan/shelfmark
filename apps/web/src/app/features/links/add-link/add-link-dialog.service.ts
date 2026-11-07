import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import type { AddLinkData } from '../models/add-link-data.interface';
import type { AddLinkResult } from '../models/add-link-result.type';
import { AddLinkDialogComponent } from './add-link-dialog.component';

/**
 * Opens the add-link dialog; features call `inject(AddLinkDialogService).open({ folderId })`.
 * Resolves with the saved link, the "open existing" choice (the caller navigates), or
 * `undefined` when the dialog was dismissed.
 */
@Service()
export class AddLinkDialogService {
  private readonly dialogs = inject(DialogService);

  open(data: AddLinkData = {}): Promise<AddLinkResult | undefined> {
    return this.dialogs.open<AddLinkDialogComponent, AddLinkResult, AddLinkData>(
      AddLinkDialogComponent,
      { size: DIALOG_SIZE.Md, data },
    ).result;
  }
}
