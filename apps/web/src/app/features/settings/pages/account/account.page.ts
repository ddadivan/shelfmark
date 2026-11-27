import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AvatarComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  NoticeComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { AccountDeletionStatusStore } from '../../../account-deletion/services/account-deletion-status.store';
import { AccountDeletionService } from '../../../account-deletion/services/account-deletion.service';
import { AccountShelfComponent } from '../../components/account-shelf/account-shelf.component';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';
import { AccountStatsService } from '../../services/account-stats.service';

/**
 * `/settings/account` (#352, Shelf 05-settings Account): who is signed in (the provider's photo,
 * email and member since), the "Your shelf" numbers, the connected sign-in providers, sign out and
 * deleting the account. Export moved to Settings › Your data with import (Shelf). While a deletion
 * is scheduled (grace period) the page is only the notice with "Keep my account".
 */
@Component({
  selector: 'app-settings-account-page',
  imports: [
    TranslocoPipe,
    AccountShelfComponent,
    AvatarComponent,
    ButtonComponent,
    NoticeComponent,
    SkeletonComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  providers: [AccountStatsService],
  templateUrl: './account.page.html',
  styleUrl: './account.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccountPage {
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly auth = inject(AuthStore);
  protected readonly stats = inject(AccountStatsService);
  private readonly viewport = inject(ViewportService);
  private readonly accountDeletion = inject(AccountDeletionService);
  protected readonly deletion = inject(AccountDeletionStatusStore);
  protected readonly locale = inject(LocaleService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  /** Thumb-sized buttons on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Sm,
  );
  /** Demo sandboxes expire by themselves, so only real accounts can be deleted. */
  protected readonly canDeleteAccount = computed(() => {
    const user = this.auth.user();
    return user !== null && !user.isDemo;
  });

  constructor() {
    void this.deletion.load();
  }

  protected async keepAccount(): Promise<void> {
    const kept = await this.deletion.keep();
    this.toasts.show(
      kept
        ? { kind: TOAST_KIND.Success, title: this.transloco.translate('settings.delete.kept') }
        : {
            kind: TOAST_KIND.Danger,
            title: this.transloco.translate('settings.delete.keepFailed'),
          },
    );
  }

  protected async deleteAccount(): Promise<void> {
    await this.accountDeletion.open();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
