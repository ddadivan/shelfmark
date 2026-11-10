import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, SettingsRowComponent, SettingsSectionComponent } from '@shelfmark/ui';
import { APP_PATH } from '../../../models/app-path.const';
import { SETTINGS_PATH } from '../models/settings-path.const';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

/** `/settings/privacy`: the policy, the way to take your data out, and what is kept. */
@Component({
  selector: 'app-settings-privacy-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './privacy-data.page.html',
  styleUrl: './privacy-data.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyDataPage {
  private readonly router = inject(Router);

  protected readonly policyHref = `/${APP_PATH.Privacy}`;
  protected readonly exportHref = `/${APP_PATH.Settings}/${SETTINGS_PATH.ImportExport}`;

  protected async open(event: MouseEvent, href: string): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(href);
  }
}
