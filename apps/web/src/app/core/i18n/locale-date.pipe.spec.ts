import { TestBed } from '@angular/core/testing';
import { DATE_FORMAT, LANGUAGE_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { provideTranslocoForTest } from '../../testing/transloco-testing';
import { LocaleDatePipe } from './locale-date.pipe';
import { LocaleService } from './locale.service';

describe('LocaleDatePipe', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('formats with the active locale and date format, and is empty for no value', () => {
    TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
    const pipe = TestBed.runInInjectionContext(() => new LocaleDatePipe());

    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('2026-11-10T12:00:00.000Z')).toMatch(/2026/);

    TestBed.inject(LocaleService).apply({
      ...LANGUAGE_SETTINGS_DEFAULT,
      dateFormat: DATE_FORMAT.Iso,
    });
    expect(pipe.transform(new Date(2026, 10, 10))).toBe('2026-11-10');
  });
});
