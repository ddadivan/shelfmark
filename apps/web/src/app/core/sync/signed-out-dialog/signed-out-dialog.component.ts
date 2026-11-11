import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, DialogComponent, UiDialogRef } from '@shelfmark/ui';

/** "You signed out in another tab": the lock of `SignedOutLockService`. */
@Component({
  selector: 'app-signed-out-dialog',
  imports: [ButtonComponent, DialogComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signed-out-dialog.component.html',
  styleUrl: './signed-out-dialog.component.scss',
})
export class SignedOutDialogComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);

  protected signInAgain(): void {
    this.ref.close(true);
  }
}
