import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { ExportDialogComponent } from '../components/export-dialog/export-dialog.component';

/** Opens "Export" (the whole library) from the data menu, the You tab and Settings; nothing happens while another dialog is open. */
@Service()
export class ExportDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);

  /** Opens the dialog (a bottom sheet on a phone). */
  open(): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    this.dialogs.open(ExportDialogComponent, { size: DIALOG_SIZE.Sm });
  }
}
