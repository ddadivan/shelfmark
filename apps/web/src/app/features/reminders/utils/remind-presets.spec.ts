import { REMIND_PRESET } from '../models/remind-preset.const';
import { remindPresets } from './remind-presets';

/** Local time, so the expectations hold in any time zone. */
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('remindPresets', () => {
  it('offers every preset on a weekday morning', () => {
    // Wednesday 11 November 2026, 10:30.
    const options = remindPresets(local(2026, 11, 11, 10, 30));
    expect(options.map((option) => option.preset)).toEqual([
      REMIND_PRESET.LaterToday,
      REMIND_PRESET.Tomorrow,
      REMIND_PRESET.Weekend,
      REMIND_PRESET.NextWeek,
      REMIND_PRESET.InMonth,
    ]);
    expect(options.map((option) => option.at)).toEqual([
      local(2026, 11, 11, 18),
      local(2026, 11, 12, 9),
      local(2026, 11, 14, 10),
      local(2026, 11, 16, 9),
      local(2026, 12, 11, 9),
    ]);
  });

  it('drops Later today from 17:00', () => {
    const options = remindPresets(local(2026, 11, 11, 17, 0));
    expect(options[0]?.preset).toBe(REMIND_PRESET.Tomorrow);
  });

  it('drops This weekend on the weekend; from a Sunday Next week is the Monday after tomorrow', () => {
    // Sunday 15 November 2026: tomorrow is Monday 16, so Next week is Monday 23.
    const options = remindPresets(local(2026, 11, 15, 20));
    expect(options.map((option) => option.preset)).not.toContain(REMIND_PRESET.Weekend);
    expect(options.find((option) => option.preset === REMIND_PRESET.NextWeek)?.at).toEqual(
      local(2026, 11, 23, 9),
    );
    // Saturday 14 November: the coming Monday is two days away.
    const saturday = remindPresets(local(2026, 11, 14, 12));
    expect(saturday.find((option) => option.preset === REMIND_PRESET.NextWeek)?.at).toEqual(
      local(2026, 11, 16, 9),
    );
  });

  it('goes to the next Monday from a Monday, and to Saturday from a Friday', () => {
    const monday = remindPresets(local(2026, 11, 16, 8));
    expect(monday.find((option) => option.preset === REMIND_PRESET.NextWeek)?.at).toEqual(
      local(2026, 11, 23, 9),
    );
    const friday = remindPresets(local(2026, 11, 20, 8));
    expect(friday.find((option) => option.preset === REMIND_PRESET.Weekend)?.at).toEqual(
      local(2026, 11, 21, 10),
    );
  });

  it('keeps In a month inside a shorter month and across the year', () => {
    const january = remindPresets(local(2027, 1, 31, 12));
    expect(january.find((option) => option.preset === REMIND_PRESET.InMonth)?.at).toEqual(
      local(2027, 2, 28, 9),
    );
    const december = remindPresets(local(2026, 12, 15, 12));
    expect(december.find((option) => option.preset === REMIND_PRESET.InMonth)?.at).toEqual(
      local(2027, 1, 15, 9),
    );
  });
});
