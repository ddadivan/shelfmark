import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  DialogService,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { LinksStore } from '../../../../stores/links.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { SETTINGS_PATH } from '../../models/settings-path.const';
import { YOUR_DATA_FRAGMENT } from '../../models/your-data-fragment.const';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';

const KEY = 'settings.privacy.recent';

/**
 * `/settings/privacy`: "Remember recently opened" (moved here from Appearance in #315), the way
 * to take your data out (Account › Your data), the policy, and what is kept.
 */
@Component({
  selector: 'app-settings-privacy-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
  ],
  templateUrl: './privacy-data.page.html',
  styleUrl: './privacy-data.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyDataPage {
  private readonly router = inject(Router);
  protected readonly settings = inject(UserSettingsStore);
  private readonly links = inject(LinksStore);
  private readonly dialogs = inject(DialogService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

  protected readonly policyHref = `/${APP_PATH.Privacy}`;
  /** Export lives in Account › Your data (#352). */
  protected readonly exportHref = `/${APP_PATH.Settings}/${SETTINGS_PATH.Account}#${YOUR_DATA_FRAGMENT}`;

  constructor() {
    void this.settings.load();
  }

  protected async open(event: MouseEvent, href: string): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(href);
  }

  /**
   * "Remember recently opened": on resumes recording opens; off asks first, then clears the list
   * and stops recording (the account's "Pause history"). A switch that was not confirmed, or a
   * failed save, stays or goes back on.
   */
  protected async setRemember(on: boolean, control: SwitchComponent): Promise<void> {
    if (on) {
      if (!(await this.settings.setPauseHistory(false))) {
        control.checked.set(false);
        this.failed();
      }
      return;
    }
    const confirmed = await this.dialogs.confirm({
      title: this.transloco.translate(`${KEY}.confirm.title`),
      message: this.transloco.translate(`${KEY}.confirm.message`),
      confirmLabel: this.transloco.translate(`${KEY}.confirm.confirm`),
      cancelLabel: this.transloco.translate(`${KEY}.confirm.cancel`),
      closeLabel: this.transloco.translate(`${KEY}.confirm.close`),
      destructive: true,
    });
    if (!confirmed) {
      control.checked.set(true);
      return;
    }
    if (!(await this.settings.setPauseHistory(true))) {
      control.checked.set(true);
      this.failed();
      return;
    }
    if (!(await this.links.clearHistory())) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('links.recent.clearFailed'),
      });
    }
  }

  private failed(): void {
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.transloco.translate('settings.library.failed'),
      detail: this.transloco.translate('settings.library.failedDetail'),
    });
  }
}
