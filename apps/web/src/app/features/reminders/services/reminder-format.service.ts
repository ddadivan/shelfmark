import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { activeLang } from '../../../core/i18n/active-lang';
import { LocaleService } from '../../../core/i18n/locale.service';

const DAYS_PER_WEEK = 7;

/** Local midnight `days` after the day of `now`. */
function midnight(now: Date, days: number): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).getTime();
}

/**
 * Reminder times in the interface language and the browser's time zone (#275), with the clock of
 * the Time setting (`LocaleService`). Reads the active language, so a `computed` that calls it
 * follows a switch.
 */
@Service()
export class ReminderFormatService {
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);

  /**
   * "Today, 18:00", "Tomorrow, 9:00", "Sat, 10:00" within the week, then "1 Dec, 9:00" (and the
   * year when it is not this one).
   */
  when(iso: string, now: number = Date.now()): string {
    activeLang();
    const at = new Date(iso);
    const today = new Date(now);
    const time = this.locale.formatTime(at);
    const value = at.getTime();
    if (value >= midnight(today, 0) && value < midnight(today, 1)) {
      return this.transloco.translate('reminders.when.today', { time });
    }
    if (value >= midnight(today, 1) && value < midnight(today, 2)) {
      return this.transloco.translate('reminders.when.tomorrow', { time });
    }
    const day =
      value >= midnight(today, 0) && value < midnight(today, DAYS_PER_WEEK)
        ? this.locale.formatWeekday(at)
        : this.locale
            .dateTimeFormat({
              day: 'numeric',
              month: 'short',
              year: at.getFullYear() === today.getFullYear() ? undefined : 'numeric',
            })
            .format(at);
    return this.transloco.translate('reminders.when.day', { day, time });
  }

  /** The reminder has come: its time has passed. */
  isDue(iso: string, now: number = Date.now()): boolean {
    return Date.parse(iso) <= now;
  }

  /** The chip on a card or row: "Due 3 hours ago" once it has come, else the time ahead. */
  chip(iso: string, now: number = Date.now()): string {
    activeLang();
    return this.isDue(iso, now)
      ? this.transloco.translate('reminders.chip.due', {
          when: this.locale.formatRelative(iso, now),
        })
      : this.when(iso, now);
  }

  /** The browser's time zone (`Europe/Kyiv`): reminder times are in it. */
  timeZone(): string {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
