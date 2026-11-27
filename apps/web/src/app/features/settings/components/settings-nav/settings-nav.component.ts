import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ICON_SIZE, IconComponent, RippleDirective } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { APP_VERSION } from '../../../../models/app-version.const';
import { SETTINGS_NAV_ENTRIES } from '../../models/settings-nav-entries.const';
import { isPlainLeftClick } from '../../../../core/layout/utils/is-plain-left-click';

/**
 * The settings nav of tablet and desktop (Shelf 05-settings): it takes the place of the sidebar
 * on `/settings/*`. "Back to links", the heading, then one row per section with its glyph; the
 * open page's row is `aria-current="page"`; the version at the bottom.
 */
@Component({
  selector: 'app-settings-nav',
  imports: [TranslocoPipe, IconComponent, RippleDirective, RouterLink, RouterLinkActive],
  templateUrl: './settings-nav.component.html',
  styleUrl: './settings-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNavComponent {
  private readonly router = inject(Router);

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly entries = SETTINGS_NAV_ENTRIES;
  protected readonly appVersion = APP_VERSION;
  protected readonly linksHref = `/${APP_PATH.Links}`;
  protected readonly settingsPath = `/${APP_PATH.Settings}`;

  protected async back(event: MouseEvent): Promise<void> {
    // Modified clicks (new tab, new window) stay native.
    if (!isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();
    await this.router.navigateByUrl(this.linksHref);
  }
}
