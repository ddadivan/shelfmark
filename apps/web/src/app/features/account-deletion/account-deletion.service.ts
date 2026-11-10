import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { DIALOG_ROLE, DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { AUTH_ROUTE } from '../../core/auth/models/auth-routes.const';
import { DIALOG_FIRST_FIELD } from '../../models/dialog-first-field.const';
import { DeleteAccountDialogComponent } from './delete-account-dialog.component';
import { DELETE_ACCOUNT_TEXT_ID } from './models/delete-account-text-id.const';
import { ACCOUNT_DELETION_API } from './models/account-deletion-api.const';
import { ACCOUNT_DELETION_OUTCOME } from './models/account-deletion-outcome.const';
import type { AccountDeletionOutcome } from './models/account-deletion-outcome.type';
import type { DeleteAccountDialogData } from './models/delete-account-dialog-data.interface';

/**
 * Settings, "Delete account": opens the typed-email confirmation, sends `DELETE /api/me` from
 * inside it (so errors show in the dialog) and, once the server confirmed, forgets the session
 * and every cached store, goes to the landing page and confirms with a toast. Demo users cannot
 * delete (their sandbox expires on its own): `open()` does nothing for them.
 */
@Service()
export class AccountDeletionService {
  private readonly api = inject(ACCOUNT_DELETION_API);
  private readonly auth = inject(AuthStore);
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  async open(): Promise<void> {
    const user = this.auth.user();
    if (!user || user.isDemo) {
      return;
    }
    // The request outlives the dialog: whatever closes it, a confirmed deletion must end the session.
    const request: { current: Promise<AccountDeletionOutcome> | null } = { current: null };
    await this.dialogs.open<DeleteAccountDialogComponent, boolean, DeleteAccountDialogData>(
      DeleteAccountDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        role: DIALOG_ROLE.AlertDialog,
        scrimClose: false,
        describedBy: DELETE_ACCOUNT_TEXT_ID,
        autoFocus: DIALOG_FIRST_FIELD,
        data: {
          email: user.email,
          submit: (email) => {
            request.current = this.delete(email);
            return request.current;
          },
        },
      },
    ).result;
    const outcome = request.current ? await request.current : null;
    if (outcome === ACCOUNT_DELETION_OUTCOME.Deleted) {
      // The server cleared the cookie; drop the user and the cached library without a sign-out call.
      this.auth.expireSession();
      await this.router.navigateByUrl(AUTH_ROUTE.Home);
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.transloco.translate('settings.delete.done'),
        detail: this.transloco.translate('settings.delete.doneDetail'),
      });
    }
  }

  private async delete(email: string): Promise<AccountDeletionOutcome> {
    try {
      await this.api.delete({ email });
      return ACCOUNT_DELETION_OUTCOME.Deleted;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case HttpStatusCode.BadRequest:
            return ACCOUNT_DELETION_OUTCOME.Mismatch;
          case HttpStatusCode.TooManyRequests:
            return ACCOUNT_DELETION_OUTCOME.RateLimited;
          case HttpStatusCode.Unauthorized:
            return ACCOUNT_DELETION_OUTCOME.SessionGone;
        }
      }
      return ACCOUNT_DELETION_OUTCOME.Failed;
    }
  }
}
