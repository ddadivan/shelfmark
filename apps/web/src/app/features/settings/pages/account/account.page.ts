import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AvatarComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
} from '@shelfmark/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { AccountDeletionService } from '../../../account-deletion/services/account-deletion.service';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';

/** `/settings/account`: who is signed in, sign out and deleting the account. */
@Component({
  selector: 'app-settings-account-page',
  imports: [
    TranslocoPipe,
    AvatarComponent,
    ButtonComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccountPage {
  protected readonly auth = inject(AuthStore);
  private readonly viewport = inject(ViewportService);
  private readonly accountDeletion = inject(AccountDeletionService);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  /** Thumb-sized buttons on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Md,
  );
  /** Demo sandboxes expire by themselves, so only real accounts can be deleted. */
  protected readonly canDeleteAccount = computed(() => {
    const user = this.auth.user();
    return user !== null && !user.isDemo;
  });

  protected async deleteAccount(): Promise<void> {
    await this.accountDeletion.open();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
