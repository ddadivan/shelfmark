import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { KEYBOARD_KEY } from '../../models/keyboard';
import {
  addDays,
  addMonths,
  localIsoDay,
  monthOf,
  monthTitle,
  monthWeeks,
  parseIsoDay,
  weekdays,
  weekOffset,
} from './calendar-math';
import type { CalendarDay } from './models/calendar-day.interface';

const DAYS_PER_WEEK = 7;

/**
 * DatePicker (`docs/design/components/DatePicker`): a month calendar to pick one day. `date` is a
 * `YYYY-MM-DD` string (`null` = none). Weekday and month names come from `Intl` in `locale`;
 * weeks start on `firstDay` (ISO 1 Monday … 7 Sunday). A grid of native buttons with one tab stop:
 * the arrow keys move a day or a week, Home and End go to the start or end of the week, Page Up
 * and Page Down change the month, Enter and Space pick. Days before `min` are disabled. Presets
 * belong to the caller (they are a time, not only a day).
 */
@Component({
  selector: 'ui-date-picker',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-date-picker' },
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
})
export class DatePickerComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The picked day, `YYYY-MM-DD`; `null` when none is picked. */
  readonly date = model<string | null>(null);
  /** BCP 47 locale for the names (the interface language). */
  readonly locale = input('en');
  /** First day of the week: ISO 1 (Monday) … 7 (Sunday). */
  readonly firstDay = input(1);
  /** Earliest day that can be picked, `YYYY-MM-DD`. */
  readonly min = input<string | null>(null);
  /** Today, `YYYY-MM-DD` (the outlined day); the local day by default. */
  readonly today = input<string>(localIsoDay(new Date()));
  readonly previousMonthLabel = input.required<string>();
  readonly nextMonthLabel = input.required<string>();

  /** The day that holds the tab stop: the picked day, else today, else the earliest allowed. */
  protected readonly active = linkedSignal(() => {
    const picked = parseIsoDay(this.date()) ? this.date() : null;
    const min = this.min();
    const today = this.today();
    return picked ?? (min !== null && today < min ? min : today);
  });
  /** First day of the month shown; follows the active day. */
  protected readonly month = computed(() => monthOf(this.active()));
  protected readonly title = computed(() => monthTitle(this.month(), this.locale()));
  protected readonly weekdays = computed(() => weekdays(this.locale(), this.firstDay()));
  protected readonly weeks = computed(() =>
    monthWeeks(this.month(), {
      locale: this.locale(),
      firstDay: this.firstDay(),
      today: this.today(),
      min: this.min(),
    }),
  );
  /** The month before has an allowed day. */
  protected readonly canGoBack = computed(() => {
    const min = this.min();
    return min === null || this.month() > monthOf(min);
  });

  protected pick(day: CalendarDay): void {
    if (day.disabled) {
      return;
    }
    this.active.set(day.iso);
    this.date.set(day.iso);
  }

  protected shiftMonth(months: number): void {
    this.moveTo(addMonths(this.active(), months), false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const current = this.active();
    const offset = weekOffset(current, this.firstDay());
    const targets: Record<string, string> = {
      [KEYBOARD_KEY.ArrowLeft]: addDays(current, -1),
      [KEYBOARD_KEY.ArrowRight]: addDays(current, 1),
      [KEYBOARD_KEY.ArrowUp]: addDays(current, -DAYS_PER_WEEK),
      [KEYBOARD_KEY.ArrowDown]: addDays(current, DAYS_PER_WEEK),
      [KEYBOARD_KEY.Home]: addDays(current, -offset),
      [KEYBOARD_KEY.End]: addDays(current, DAYS_PER_WEEK - 1 - offset),
      PageUp: addMonths(current, -1),
      PageDown: addMonths(current, 1),
    };
    const target = targets[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    this.moveTo(target, true);
  }

  /** Moves the tab stop (never before `min`) and, from the keyboard, the focus with it. */
  private moveTo(iso: string, focus: boolean): void {
    const min = this.min();
    this.active.set(min !== null && iso < min ? min : iso);
    if (!focus) {
      return;
    }
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLButtonElement>(`[data-day="${this.active()}"]`)
          ?.focus(),
      { injector: this.injector },
    );
  }
}
