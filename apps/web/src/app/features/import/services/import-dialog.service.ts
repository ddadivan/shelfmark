import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { ImportDialogComponent } from '../components/import-dialog/import-dialog.component';

/** Opens "Import links" from Account › Your data; nothing happens while another dialog is open. */
@Service()
export class ImportDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);

  open(): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    this.dialogs.open(ImportDialogComponent, { size: DIALOG_SIZE.Md });
  }
}
