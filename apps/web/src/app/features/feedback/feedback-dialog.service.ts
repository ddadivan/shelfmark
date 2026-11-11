import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { SendFeedbackDialogComponent } from './send-feedback-dialog.component';

/** Opens the "Send feedback" dialog from the account menu, the You list and Your feedback. */
@Service()
export class FeedbackDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);

  /** Opens the dialog (a sheet on a phone); nothing happens while another dialog is open. */
  open(): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    this.dialogs.open(SendFeedbackDialogComponent, {
      size: DIALOG_SIZE.Md,
      autoFocus: 'textarea',
    });
  }
}
