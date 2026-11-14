import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  INTERFACE_LANGUAGE,
  isInterfaceLanguage,
  type LanguageSettings,
} from '@shelfmark/contracts';
import {
  RadioGroupComponent,
  SettingsSectionComponent,
  TOAST_KIND,
  ToastService,
  type RadioOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { APP_LANG } from '../../../../core/i18n/models/app-lang.const';
import { LANGUAGE_NAMES } from '../../../../core/i18n/models/language-names.const';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';
import { LANGUAGE_FLAGS } from './models/language-flags.const';

/**
 * `/settings/language` (SetLanguage mockup, #274; #315: only the language). The interface
 * languages as one plain list, each with its flag and its own name, then "Match my browser". The
 * date and time formats moved to Settings › Appearance. A choice applies at once without a reload
 * (`LocaleService`), is saved on the account and rolls back with a toast when the request fails.
 */
@Component({
  selector: 'app-settings-language-page',
  imports: [
    TranslocoPipe,
    RadioGroupComponent,
    SettingsPageHeaderComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './language.page.html',
  styleUrl: './language.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LanguageSettingsPage {
  private readonly settings = inject(UserSettingsStore);
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

  protected readonly language = this.locale.settings;

  protected readonly languageOptions = computed<RadioOption[]>(() => {
    activeLang(); // "Match my browser" is translated
    return [
      ...Object.values(APP_LANG).map((lang) => ({
        value: lang,
        title: LANGUAGE_NAMES[lang],
        flag: LANGUAGE_FLAGS[lang],
        lang,
      })),
      {
        value: INTERFACE_LANGUAGE.Browser,
        title: this.transloco.translate('settings.language.interface.browser'),
        icon: 'monitor' as const,
      },
    ];
  });

  constructor() {
    void this.settings.load();
  }

  protected setLanguage(value: string): void {
    if (isInterfaceLanguage(value)) {
      void this.save({ language: value });
    }
  }

  /** Saves a choice at once; a failed request puts it back and says so. */
  protected async save(change: Partial<LanguageSettings>): Promise<void> {
    if (!(await this.settings.setLanguage(change))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('settings.language.failed'),
        detail: this.transloco.translate('settings.language.failedDetail'),
      });
    }
  }
}
