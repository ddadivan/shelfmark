import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  DATE_FORMAT,
  INTERFACE_LANGUAGE,
  TIME_FORMAT,
  WEEK_START,
  isDateFormat,
  isInterfaceLanguage,
  isTimeFormat,
  isWeekStart,
  type DateFormat,
  type LanguageSettings,
} from '@shelfmark/contracts';
import {
  SegmentedControlComponent,
  SelectComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
  type SelectOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../core/i18n/active-lang';
import { LocaleService } from '../../../core/i18n/locale.service';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { LANGUAGE_NAMES } from '../../../core/i18n/models/language-names.const';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { SettingsPageHeaderComponent } from '../settings-page-header/settings-page-header.component';

/** A Monday and a Sunday, to name the week start options in the active language. */
const MONDAY = new Date(2026, 10, 9);
const SUNDAY = new Date(2026, 10, 15);

/**
 * `/settings/language` (SetLanguage mockup, #274). Language: the interface language (each in its
 * own name, plus "Match my browser") and spell-check in notes. Dates and numbers: date format,
 * 24- or 12-hour clock, the first day of the week and a live preview. Every change applies at once
 * without a reload (`LocaleService`), is saved on the account and rolls back with a toast when the
 * request fails.
 */
@Component({
  selector: 'app-settings-language-page',
  imports: [
    TranslocoPipe,
    SegmentedControlComponent,
    SelectComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
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

  /** The moment the page opened: the sample of the date formats and the preview. */
  private readonly now = new Date();

  protected readonly language = this.locale.settings;

  protected readonly languageOptions = computed<SelectOption[]>(() => {
    activeLang(); // "Match my browser" is translated
    return [
      ...Object.values(APP_LANG).map((lang) => ({ id: lang, name: LANGUAGE_NAMES[lang], lang })),
      {
        id: INTERFACE_LANGUAGE.Browser,
        name: this.transloco.translate('settings.language.interface.browser'),
      },
    ];
  });

  protected readonly dateOptions = computed<SelectOption[]>(() => {
    const sample = (format: DateFormat): string => this.locale.formatDate(this.now, format);
    return Object.values(DATE_FORMAT).map((format) => ({
      id: format,
      name:
        format === DATE_FORMAT.Default
          ? this.transloco.translate('settings.language.date.default', {
              example: sample(format),
            })
          : sample(format),
    }));
  });

  protected readonly timeOptions = computed<SegmentedOption[]>(() => {
    activeLang();
    return [
      {
        value: TIME_FORMAT.Default,
        label: this.transloco.translate('settings.language.time.default'),
      },
      { value: TIME_FORMAT.H24, label: this.transloco.translate('settings.language.time.h24') },
      { value: TIME_FORMAT.H12, label: this.transloco.translate('settings.language.time.h12') },
    ];
  });

  protected readonly weekOptions = computed<SegmentedOption[]>(() => {
    activeLang();
    return [
      {
        value: WEEK_START.Default,
        label: this.transloco.translate('settings.language.week.default'),
      },
      { value: WEEK_START.Monday, label: this.locale.formatWeekday(MONDAY, 'long') },
      { value: WEEK_START.Sunday, label: this.locale.formatWeekday(SUNDAY, 'long') },
    ];
  });

  /** "Tue, 10 Nov 2026, 12:10": today in the chosen formats. */
  protected readonly preview = computed(() => {
    activeLang();
    return this.transloco.translate('settings.language.preview.value', {
      weekday: this.locale.formatWeekday(this.now),
      date: this.locale.formatDate(this.now),
      time: this.locale.formatTime(this.now),
    });
  });

  constructor() {
    void this.settings.load();
  }

  protected setLanguage(value: string | null): void {
    if (isInterfaceLanguage(value)) {
      void this.save({ language: value });
    }
  }

  protected setDateFormat(value: string | null): void {
    if (isDateFormat(value)) {
      void this.save({ dateFormat: value });
    }
  }

  protected setTimeFormat(value: string): void {
    if (isTimeFormat(value)) {
      void this.save({ timeFormat: value });
    }
  }

  protected setWeekStart(value: string): void {
    if (isWeekStart(value)) {
      void this.save({ weekStart: value });
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
