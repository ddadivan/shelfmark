import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import type { AppLang } from '../../../../core/i18n/models/app-lang.type';
import { LANGUAGE_NAMES } from '../../../../core/i18n/models/language-names.const';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LANDING_LINKS } from '../../models/landing-links.const';

/**
 * Page footer: copyright, the privacy policy, the GitHub link and the language switcher (#274):
 * each language in its own name. A guest's choice stays in this browser (and is saved on the
 * account at the first sign-in); a signed-in visitor of `/about` saves it on the account.
 */
@Component({
  selector: 'app-landing-footer',
  imports: [ButtonComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.scss',
})
export class LandingFooterComponent {
  private readonly auth = inject(AuthStore);
  private readonly settings = inject(UserSettingsStore);
  protected readonly locale = inject(LocaleService);

  protected readonly LANDING_LINKS = LANDING_LINKS;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly languages = Object.values(APP_LANG).map((lang) => ({
    lang,
    name: LANGUAGE_NAMES[lang],
  }));

  protected choose(lang: AppLang): void {
    if (this.auth.isSignedIn()) {
      void this.settings.setLanguage({ language: lang });
    } else {
      this.locale.apply({ ...this.locale.settings(), language: lang });
    }
  }
}
