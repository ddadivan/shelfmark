import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { RippleDirective } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { SETTINGS_NAV_ENTRIES } from '../../models/settings-nav-entries.const';

/**
 * The settings sections as a row of chips on a tablet (Shelf 05-settings at 820px): the sidebar
 * nav is gone below 64em and the phone's You list is a page of its own, so the tablet switches
 * sections here. The open section is `aria-current="page"`; the row scrolls sideways when the
 * labels do not fit.
 */
@Component({
  selector: 'app-settings-chips',
  imports: [TranslocoPipe, RippleDirective, RouterLink, RouterLinkActive],
  templateUrl: './settings-chips.component.html',
  styleUrl: './settings-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsChipsComponent {
  protected readonly entries = SETTINGS_NAV_ENTRIES;
  protected readonly settingsPath = `/${APP_PATH.Settings}`;
}
