import { READER_PAGE_THEME } from './reader-page-theme.const';
import type { ReaderPageTheme } from './reader-page-theme.type';
import { READER_TEXT_FONT } from './reader-text-font.const';
import type { ReaderTextFont } from './reader-text-font.type';
import { READER_TEXT_MEASURE } from './reader-text-measure.const';
import type { ReaderTextMeasure } from './reader-text-measure.type';
import { READER_TEXT_SIZE_RANGE } from './reader-text-size-range.const';
import { READER_TEXT_SPACING } from './reader-text-spacing.const';
import type { ReaderTextSpacing } from './reader-text-spacing.type';

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isReaderPageTheme(value: unknown): value is ReaderPageTheme {
  return isOneOf(Object.values(READER_PAGE_THEME), value);
}

export function isReaderTextFont(value: unknown): value is ReaderTextFont {
  return isOneOf(Object.values(READER_TEXT_FONT), value);
}

export function isReaderTextSpacing(value: unknown): value is ReaderTextSpacing {
  return isOneOf(Object.values(READER_TEXT_SPACING), value);
}

export function isReaderTextMeasure(value: unknown): value is ReaderTextMeasure {
  return isOneOf(Object.values(READER_TEXT_MEASURE), value);
}

/** A whole px size within `READER_TEXT_SIZE_RANGE`. */
export function isReaderTextSize(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= READER_TEXT_SIZE_RANGE.Min &&
    value <= READER_TEXT_SIZE_RANGE.Max
  );
}
