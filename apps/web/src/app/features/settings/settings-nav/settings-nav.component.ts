import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, RippleDirective } from '@shelfmark/ui';
import { APP_PATH } from '../../../models/app-path.const';
import { SETTINGS_NAV_ENTRIES } from '../models/settings-nav-entries.const';

/**
 * The settings nav of tablet and desktop: it takes the place of the sidebar on `/settings/*`.
 * "Back to links", then one row per section; the open page's row is `aria-current="page"`.
 */
@Component({
  selector: 'app-settings-nav',
  imports: [TranslocoPipe, ButtonComponent, RippleDirective, RouterLink, RouterLinkActive],
  templateUrl: './settings-nav.component.html',
  styleUrl: './settings-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNavComponent {
  private readonly router = inject(Router);

  protected readonly entries = SETTINGS_NAV_ENTRIES;
  protected readonly linksHref = `/${APP_PATH.Links}`;
  protected readonly settingsPath = `/${APP_PATH.Settings}`;

  protected async back(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.linksHref);
  }
}
