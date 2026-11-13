import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AvatarComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
} from '@shelfmark/ui';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { AccountDeletionService } from '../../../account-deletion/services/account-deletion.service';
import { ExportActionsService } from '../../../export/services/export-actions.service';
import { AccountShelfComponent } from '../../components/account-shelf/account-shelf.component';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';
import { YOUR_DATA_FRAGMENT } from '../../models/your-data-fragment.const';
import { AccountStatsService } from '../../services/account-stats.service';

/**
 * `/settings/account` (#352): who is signed in (the provider's photo, member since), the "Your
 * shelf" numbers, the connected sign-in providers, "Your data" (export, moved here from its own
 * section) and deleting the account, plus sign out.
 */
@Component({
  selector: 'app-settings-account-page',
  imports: [
    TranslocoPipe,
    AccountShelfComponent,
    AvatarComponent,
    ButtonComponent,
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
  protected readonly auth = inject(AuthStore);
  protected readonly stats = inject(AccountStatsService);
  private readonly viewport = inject(ViewportService);
  private readonly accountDeletion = inject(AccountDeletionService);
  private readonly exporter = inject(ExportActionsService);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;
  protected readonly YOUR_DATA_FRAGMENT = YOUR_DATA_FRAGMENT;
  /** Thumb-sized buttons on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Md,
  );
  /** Demo sandboxes expire by themselves, so only real accounts can be deleted. */
  protected readonly canDeleteAccount = computed(() => {
    const user = this.auth.user();
    return user !== null && !user.isDemo;
  });

  private readonly fragment = toSignal(inject(ActivatedRoute).fragment);
  private readonly yourData = viewChild<ElementRef<HTMLElement>>('yourData');
  private scrolledToFragment = false;

  constructor() {
    // `/settings/account#your-data` (the old export page, Privacy and data's "Open export"): once
    // the shelf above has its final height, bring "Your data" into view in the scrolling column.
    afterRenderEffect(() => {
      const target = this.yourData()?.nativeElement;
      const settled = this.stats.loaded() || this.stats.failed();
      if (target && settled && !this.scrolledToFragment && this.fragment() === YOUR_DATA_FRAGMENT) {
        this.scrolledToFragment = true;
        target.scrollIntoView({ block: 'start' });
      }
    });
  }

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected async deleteAccount(): Promise<void> {
    await this.accountDeletion.open();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
