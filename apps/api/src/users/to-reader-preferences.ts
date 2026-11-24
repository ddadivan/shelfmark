import {
  READER_PREFERENCES_DEFAULT,
  isReaderPageTheme,
  isReaderTextFont,
  isReaderTextMeasure,
  isReaderTextSize,
  isReaderTextSpacing,
  type ReaderPreferences,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import type { ReaderRow } from './models/reader-row.interface';

/**
 * Reads the reading settings part of the settings. The CHECKs keep the columns valid; a value that
 * still slips through (a hand edit) falls back to the default instead of reaching the client.
 */
export function toReaderPreferences(
  row: ReaderRow,
): ReaderPreferences & Pick<UserSettingsResponse, 'readerSaved'> {
  const d = READER_PREFERENCES_DEFAULT;
  return {
    readerTheme: isReaderPageTheme(row.readerTheme) ? row.readerTheme : null,
    readerFont: isReaderTextFont(row.readerFont) ? row.readerFont : d.readerFont,
    readerSize: isReaderTextSize(row.readerSize) ? row.readerSize : d.readerSize,
    readerLineSpacing: isReaderTextSpacing(row.readerLineSpacing)
      ? row.readerLineSpacing
      : d.readerLineSpacing,
    readerLineWidth: isReaderTextMeasure(row.readerLineWidth)
      ? row.readerLineWidth
      : d.readerLineWidth,
    readerSaved: row.readerSavedAt !== null,
  };
}

/**
 * The reading settings columns to write for a settings change: only the fields sent (`undefined`
 * is skipped by Prisma; `readerTheme: null` is written), plus `readerSavedAt` when any was sent;
 * empty when none was.
 */
export function readerColumns(request: UpdateUserSettingsRequest, now: Date): Partial<ReaderRow> {
  const columns: Partial<ReaderRow> = {
    readerTheme: request.readerTheme,
    readerFont: request.readerFont,
    readerSize: request.readerSize,
    readerLineSpacing: request.readerLineSpacing,
    readerLineWidth: request.readerLineWidth,
  };
  return Object.values(columns).some((value) => value !== undefined)
    ? { ...columns, readerSavedAt: now }
    : {};
}
