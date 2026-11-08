import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_TYPE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  injectDialogData,
  InputComponent,
  NOTICE_KIND,
  NoticeComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { ACCOUNT_DELETION_ERROR_KEY } from './models/account-deletion-error-key.const';
import { ACCOUNT_DELETION_OUTCOME } from './models/account-deletion-outcome.const';
import type { DeleteAccountDialogData } from './models/delete-account-dialog-data.interface';

/**
 * Typed confirmation of the account deletion: the delete button stays disabled until the typed
 * email equals the account email (case-insensitive, as the API compares). Closes with `true` on
 * success; a refused or failed request keeps it open with an error notice.
 */
@Component({
  selector: 'app-delete-account-dialog',
  imports: [
    ButtonComponent,
    DialogComponent,
    FormField,
    FormRoot,
    InputComponent,
    NoticeComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-account-dialog.component.html',
  styleUrl: './delete-account-dialog.component.scss',
})
export class DeleteAccountDialogComponent {
  protected readonly BUTTON_TYPE = BUTTON_TYPE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  protected readonly data = injectDialogData<DeleteAccountDialogData>();

  private readonly model = signal({ email: '' });
  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.delete() },
  });

  protected readonly matches = computed(
    () => this.model().email.trim().toLowerCase() === this.data.email.toLowerCase(),
  );
  protected readonly deleting = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected cancel(): void {
    this.ref.close(false);
  }

  private async delete(): Promise<undefined> {
    if (this.deleting() || !this.matches()) {
      return;
    }
    this.deleting.set(true);
    this.errorKey.set(null);
    const outcome = await this.data.submit(this.model().email.trim());
    if (outcome === ACCOUNT_DELETION_OUTCOME.Deleted) {
      // `deleting` stays on: the button keeps its spinner while the dialog leaves.
      this.ref.close(true);
      return;
    }
    this.deleting.set(false);
    if (outcome === ACCOUNT_DELETION_OUTCOME.SessionGone) {
      // The global handler is sending the user to sign-in; nothing left to confirm here.
      this.ref.close(false);
      return;
    }
    this.errorKey.set(ACCOUNT_DELETION_ERROR_KEY[outcome]);
  }
}
