import {
  addDays,
  addMonths,
  localIsoDay,
  monthTitle,
  monthWeeks,
  parseIsoDay,
  weekdays,
  weekOffset,
} from './calendar-math';

const OPTIONS = { locale: 'en-GB', firstDay: 1, today: '2026-11-09', min: null };

describe('calendar math', () => {
  it('parses only real days', () => {
    expect(parseIsoDay('2026-11-14')?.toISOString()).toBe('2026-11-14T00:00:00.000Z');
    expect(parseIsoDay('2026-02-30')).toBeNull();
    expect(parseIsoDay('14/11/2026')).toBeNull();
    expect(parseIsoDay(null)).toBeNull();
  });

  it('reads the local day of a moment', () => {
    expect(localIsoDay(new Date(2026, 10, 14, 23, 30))).toBe('2026-11-14');
  });

  it('moves by days across a month and a year', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('moves by months and keeps the day inside the shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-14', -11)).toBe('2025-12-14');
  });

  it('counts the offset from the first day of the week', () => {
    // 2026-11-01 is a Sunday.
    expect(weekOffset('2026-11-01', 1)).toBe(6);
    expect(weekOffset('2026-11-01', 7)).toBe(0);
  });

  it('names the weekdays from the first day of the week in the language', () => {
    expect(weekdays('en-GB', 1).map((day) => day.long)[0]).toBe('Monday');
    expect(weekdays('en-US', 7).map((day) => day.long)[0]).toBe('Sunday');
    expect(weekdays('de', 1)[0]?.long).toBe('Montag');
  });

  it('titles the month in the language', () => {
    expect(monthTitle('2026-11-01', 'en-GB')).toBe('November 2026');
    expect(monthTitle('2026-11-01', 'fr')).toBe('novembre 2026');
  });

  it('lays out whole weeks with the days of the neighbouring months muted', () => {
    const weeks = monthWeeks('2026-11-14', OPTIONS);
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toMatchObject({ iso: '2026-10-26', outside: true });
    expect(weeks[0]?.[6]).toMatchObject({ iso: '2026-11-01', outside: false, day: 1 });
    expect(weeks[5]?.[0]).toMatchObject({ iso: '2026-11-30', outside: false });
    expect(weeks.flat().find((day) => day.today)?.iso).toBe('2026-11-09');
    expect(weeks[1]?.[6]?.label).toMatch(/^Sunday,? 8 November 2026$/);
  });

  it('disables the days before the minimum', () => {
    const days = monthWeeks('2026-11-01', { ...OPTIONS, min: '2026-11-09' }).flat();
    expect(days.find((day) => day.iso === '2026-11-08')?.disabled).toBe(true);
    expect(days.find((day) => day.iso === '2026-11-09')?.disabled).toBe(false);
  });
});
