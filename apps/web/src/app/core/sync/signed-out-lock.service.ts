import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { DIALOG_SIZE, DialogService, type UiDialogRef } from '@shelfmark/ui';
import { AUTH_ROUTE } from '../auth/models/auth-routes.const';
import { SIGN_IN_QUERY } from '../auth/models/sign-in-query.const';
import { safeReturnUrl } from '../auth/safe-return-url';
import { SignedOutDialogComponent } from './signed-out-dialog/signed-out-dialog.component';

/**
 * The lock a tab shows when the user signed out in another tab (SyncDemo.dc.html): a dialog that
 * cannot be dismissed, over a page whose library has already been cleared. "Sign in again" goes to
 * the sign-in page and comes back here; signing in from another tab reloads this one
 * (`TabSyncService`).
 */
@Service()
export class SignedOutLockService {
  private readonly dialogs = inject(DialogService);
  private readonly router = inject(Router);
  private ref: UiDialogRef<boolean, SignedOutDialogComponent> | null = null;

  async lock(): Promise<void> {
    if (this.ref) {
      return;
    }
    const returnUrl = this.router.url;
    const ref = this.dialogs.open<SignedOutDialogComponent, boolean>(SignedOutDialogComponent, {
      size: DIALOG_SIZE.Sm,
      dismissible: false,
      role: 'alertdialog',
      autoFocus: 'button',
    });
    this.ref = ref;
    const signInAgain = await ref.result;
    this.ref = null;
    if (signInAgain) {
      const safe = safeReturnUrl(returnUrl);
      await this.router.navigate([AUTH_ROUTE.SignIn], {
        queryParams: safe ? { [SIGN_IN_QUERY.ReturnUrl]: safe } : {},
      });
    }
  }
}
