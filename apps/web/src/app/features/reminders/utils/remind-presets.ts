import { REMIND_PRESET } from '../models/remind-preset.const';
import type { RemindOption } from '../models/remind-option.interface';

const MORNING_HOUR = 9;
const WEEKEND_HOUR = 10;
const EVENING_HOUR = 18;
/** "Later today" is offered while at least an hour is left before the evening. */
const LATER_TODAY_UNTIL_HOUR = 17;
const SATURDAY = 6;
const SUNDAY = 0;
const MONDAY = 1;
const DAYS_PER_WEEK = 7;

/** `days` after the local day of `now`, at `hour`:00 local time. */
function atHour(now: Date, days: number, hour: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);
}

/** Days until the next `weekday` (0 Sunday … 6 Saturday), strictly after today. */
function daysUntil(now: Date, weekday: number): number {
  return ((weekday - now.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK) + 1;
}

/** The same day next month (cut to its last day), at 9:00. */
function nextMonth(now: Date): Date {
  const last = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
  return new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    Math.min(now.getDate(), last),
    MORNING_HOUR,
    0,
    0,
    0,
  );
}

/**
 * The presets that make sense at `now`, in local time, in menu order: Later today (until 17:00),
 * Tomorrow, This weekend (Monday to Friday), Next week, In a month.
 */
export function remindPresets(now: Date): RemindOption[] {
  const options: RemindOption[] = [];
  if (now.getHours() < LATER_TODAY_UNTIL_HOUR) {
    options.push({ preset: REMIND_PRESET.LaterToday, at: atHour(now, 0, EVENING_HOUR) });
  }
  options.push({ preset: REMIND_PRESET.Tomorrow, at: atHour(now, 1, MORNING_HOUR) });
  if (now.getDay() !== SATURDAY && now.getDay() !== SUNDAY) {
    options.push({
      preset: REMIND_PRESET.Weekend,
      at: atHour(now, daysUntil(now, SATURDAY), WEEKEND_HOUR),
    });
  }
  // From a Sunday the coming Monday is "Tomorrow": "Next week" is the Monday after.
  const toMonday = daysUntil(now, MONDAY);
  options.push({
    preset: REMIND_PRESET.NextWeek,
    at: atHour(now, toMonday === 1 ? toMonday + DAYS_PER_WEEK : toMonday, MORNING_HOUR),
  });
  options.push({ preset: REMIND_PRESET.InMonth, at: nextMonth(now) });
  return options;
}
