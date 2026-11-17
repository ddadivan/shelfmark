import { TestBed } from '@angular/core/testing';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { ReminderFormatService } from './reminder-format.service';

// Wednesday 11 November 2026, 10:00 local time.
const NOW = new Date(2026, 10, 11, 10, 0).getTime();
const at = (month: number, day: number, hour: number, year = 2026) =>
  new Date(year, month - 1, day, hour, 0).toISOString();

describe('ReminderFormatService', () => {
  let format: ReminderFormatService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
    await loadEnglish();
    format = TestBed.inject(ReminderFormatService);
  });

  it('says Today and Tomorrow, the weekday within the week, then the date', () => {
    expect(format.when(at(11, 11, 18), NOW)).toMatch(/^Today, 6:00\sPM$/);
    expect(format.when(at(11, 12, 9), NOW)).toMatch(/^Tomorrow, 9:00\sAM$/);
    expect(format.when(at(11, 14, 10), NOW)).toMatch(/^Sat, 10:00\sAM$/);
    expect(format.when(at(12, 1, 9), NOW)).toMatch(/^Dec 1, 9:00\sAM$/);
    expect(format.when(at(1, 5, 9, 2027), NOW)).toMatch(/^Jan 5, 2027, 9:00\sAM$/);
  });

  it('tells a due reminder by "Due" and how long ago', () => {
    expect(format.isDue(at(11, 11, 7), NOW)).toBe(true);
    expect(format.isDue(at(11, 11, 18), NOW)).toBe(false);
    expect(format.chip(at(11, 11, 7), NOW)).toBe('Due 3 hours ago');
    expect(format.chip(at(11, 12, 9), NOW)).toMatch(/^Tomorrow, /);
  });

  it('names the browser time zone', () => {
    expect(format.timeZone()).toBe(new Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});
