import {
  READER_PAGE_THEME,
  READER_PREFERENCES_DEFAULT,
  READER_TEXT_FONT,
  READER_TEXT_MEASURE,
  READER_TEXT_SIZE_RANGE,
  READER_TEXT_SPACING,
} from '@shelfmark/contracts';
import {
  READER_FONT,
  READER_LINE_SPACING,
  READER_LINE_WIDTH,
  READER_TEXT_SIZE,
  READER_THEME,
} from '@shelfmark/ui';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import { readerPreferencesOf, readerSettingsOf } from './reader-preferences-mapping';

describe('reader preferences mapping', () => {
  it('uses the same values as ui-reader, so the account and Reader agree', () => {
    expect(READER_PAGE_THEME).toEqual(READER_THEME);
    expect(READER_TEXT_FONT).toEqual(READER_FONT);
    expect(READER_TEXT_SPACING).toEqual(READER_LINE_SPACING);
    expect(READER_TEXT_MEASURE).toEqual(READER_LINE_WIDTH);
    expect(READER_TEXT_SIZE_RANGE).toEqual({
      Min: READER_TEXT_SIZE.Min,
      Max: READER_TEXT_SIZE.Max,
      Default: READER_TEXT_SIZE.Default,
    });
    expect(readerSettingsOf(READER_PREFERENCES_DEFAULT)).toEqual(READER_SETTINGS_DEFAULT);
  });

  it('turns a change into only the fields sent, a null theme included', () => {
    expect(readerPreferencesOf({})).toEqual({});
    expect(readerPreferencesOf({ theme: null, size: 15 })).toEqual({
      readerTheme: null,
      readerSize: 15,
    });
    expect(readerPreferencesOf({ font: 'serif', lineSpacing: 'compact', width: 'wide' })).toEqual({
      readerFont: 'serif',
      readerLineSpacing: 'compact',
      readerLineWidth: 'wide',
    });
  });
});
