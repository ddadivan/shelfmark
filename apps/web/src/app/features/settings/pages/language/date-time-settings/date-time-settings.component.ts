import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  DATE_FORMAT,
  TIME_FORMAT,
  WEEK_START,
  isDateFormat,
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
  TOAST_KIND,
  ToastService,
  type SegmentedOption,
  type SelectOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../../core/i18n/locale.service';
import { UserSettingsStore } from '../../../../../stores/user-settings.store';

/** A Monday and a Sunday, to name the week start options in the active language. */
const MONDAY = new Date(2026, 10, 9);
const SUNDAY = new Date(2026, 10, 15);

/**
 * The "Dates and numbers" section of Settings › Appearance (moved from Language in #315, which
 * now only picks the language): date format, 24- or 12-hour clock, the first day of the week and a
 * live preview. Every change applies at once (`LocaleService`), is saved on the account with the
 * language settings and rolls back with a toast when the request fails.
 */
@Component({
  selector: 'app-date-time-settings',
  imports: [
    TranslocoPipe,
    SegmentedControlComponent,
    SelectComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
  ],
  templateUrl: './date-time-settings.component.html',
  styleUrl: './date-time-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimeSettingsComponent {
  private readonly settings = inject(UserSettingsStore);
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

  /** The moment the page opened: the sample of the date formats and the preview. */
  private readonly now = new Date();

  protected readonly language = this.locale.settings;

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
      { value: WEEK_START.Monday, label: this.weekday(MONDAY) },
      { value: WEEK_START.Sunday, label: this.weekday(SUNDAY) },
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

  /** The weekday name in sentence case: French, Italian, Spanish and Portuguese write it lower case. */
  private weekday(date: Date): string {
    const name = this.locale.formatWeekday(date, 'long');
    return name.charAt(0).toLocaleUpperCase(this.locale.locale()) + name.slice(1);
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
  private async save(change: Partial<LanguageSettings>): Promise<void> {
    if (!(await this.settings.setLanguage(change))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('settings.language.failed'),
        detail: this.transloco.translate('settings.language.failedDetail'),
      });
    }
  }
}
