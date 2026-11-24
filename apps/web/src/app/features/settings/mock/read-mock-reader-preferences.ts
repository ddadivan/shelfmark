import {
  READER_PREFERENCES_DEFAULT,
  isReaderPageTheme,
  isReaderTextFont,
  isReaderTextMeasure,
  isReaderTextSize,
  isReaderTextSpacing,
  type ReaderPreferences,
} from '@shelfmark/contracts';
import { MOCK_READER_PREFERENCES_STORAGE_KEY } from '../models/mock-reader-preferences-storage-key.const';

function isReaderPreferences(value: unknown): value is ReaderPreferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Partial<Record<keyof ReaderPreferences, unknown>>;
  return (
    (record.readerTheme === null || isReaderPageTheme(record.readerTheme)) &&
    isReaderTextFont(record.readerFont) &&
    isReaderTextSize(record.readerSize) &&
    isReaderTextSpacing(record.readerLineSpacing) &&
    isReaderTextMeasure(record.readerLineWidth)
  );
}

/**
 * The mock account's reading settings from `localStorage` (mock builds only) and whether they were
 * ever saved (like the account's `reader_saved_at`): only a write stores them.
 */
export function readMockReaderPreferences(storage: Storage | undefined): {
  preferences: ReaderPreferences;
  saved: boolean;
} {
  try {
    const parsed: unknown = JSON.parse(
      storage?.getItem(MOCK_READER_PREFERENCES_STORAGE_KEY) ?? 'null',
    );
    if (isReaderPreferences(parsed)) {
      return { preferences: { ...parsed }, saved: true };
    }
  } catch {
    // Missing, blocked or broken storage: the defaults below.
  }
  return { preferences: { ...READER_PREFERENCES_DEFAULT }, saved: false };
}

/** Stores the mock account's reading settings; a blocked storage keeps nothing. */
export function writeMockReaderPreferences(
  storage: Storage | undefined,
  preferences: ReaderPreferences,
): void {
  try {
    storage?.setItem(MOCK_READER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage unavailable: the change lasts until the next read.
  }
}
