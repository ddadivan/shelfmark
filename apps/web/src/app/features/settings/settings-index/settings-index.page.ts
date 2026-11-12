import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AvatarComponent,
  BUTTON_SIZE,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
} from '@shelfmark/ui';
import { AdminStore } from '../../admin/services/admin.store';
import { ADMIN_PATH } from '../../admin/models/admin-path.const';
import { FeedbackDialogService } from '../../feedback/services/feedback-dialog.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { ViewportService } from '../../../core/layout/viewport.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { LANGUAGE_NAMES } from '../../../core/i18n/models/language-names.const';
import { INTERFACE_LANGUAGE } from '@shelfmark/contracts';
import { APP_PATH } from '../../../models/app-path.const';
import { HowItWorksService } from '../../how-it-works/services/how-it-works.service';
import { SETTINGS_NAV_ENTRIES } from '../models/settings-nav-entries.const';
import { SETTINGS_PATH } from '../models/settings-path.const';
import { THEME_OPTION_KEYS } from '../models/theme-option-keys.const';

/**
 * `/settings` on a phone, the You tab (MobileSettings): the account card, one row per section,
 * Sign out, the privacy policy and the version. Each row opens that section as a page.
 */
@Component({
  selector: 'app-settings-index-page',
  imports: [TranslocoPipe, AvatarComponent, ButtonComponent, IconComponent, RouterLink],
  templateUrl: './settings-index.page.html',
  styleUrl: './settings-index.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SettingsIndexPage {
  protected readonly auth = inject(AuthStore);
  protected readonly admin = inject(AdminStore);
  protected readonly feedback = inject(FeedbackDialogService);
  private readonly theme = inject(ThemeService);
  private readonly viewport = inject(ViewportService);
  private readonly router = inject(Router);

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly SETTINGS_PATH = SETTINGS_PATH;
  protected readonly settingsPath = `/${APP_PATH.Settings}`;
  protected readonly adminFeedbackPath = ['/', APP_PATH.Admin, ADMIN_PATH.Feedback];
  protected readonly privacyHref = `/${APP_PATH.Privacy}`;
  protected readonly aboutHref = `/${APP_PATH.About}`;
  protected readonly howItWorks = inject(HowItWorksService);
  protected readonly rows = SETTINGS_NAV_ENTRIES.filter((entry) => entry.phone);
  /** The current theme, shown at the end of the Appearance row. */
  protected readonly themeKey = computed(() => THEME_OPTION_KEYS[this.theme.preference()]);
  private readonly locale = inject(LocaleService);
  /** The chosen language in its own name, shown at the end of the Language row; `null` is "Match my browser". */
  protected readonly languageName = computed(() => {
    const language = this.locale.settings().language;
    return language === INTERFACE_LANGUAGE.Browser
      ? null
      : { text: LANGUAGE_NAMES[language], lang: language };
  });

  /** The viewport grew past the phone: the list has no place here, the first section does. */
  private readonly leaveWhenWide = effect(() => {
    if (!this.viewport.compact()) {
      void this.router.navigate(['/', APP_PATH.Settings, SETTINGS_PATH.Account], {
        replaceUrl: true,
      });
    }
  });

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
