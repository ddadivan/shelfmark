import {
  READER_FONT,
  READER_LINE_SPACING,
  READER_LINE_WIDTH,
  READER_TEXT_SIZE,
  READER_THEME,
} from '@shelfmark/ui';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import type { ReaderSettings } from '../models/reader-settings.interface';

/** Text sizes of the first reading settings (S / M / L) in px. */
const OLD_SIZES: Readonly<Record<string, number>> = { s: 16, m: 18, l: 20 };
/** The first reading settings' widths: their Narrow was today's Normal (68ch). */
const OLD_WIDTHS: Readonly<Record<string, string>> = {
  narrow: READER_LINE_WIDTH.Normal,
  wide: READER_LINE_WIDTH.Wide,
};
/** The first reading settings' page: Like the app or Sepia. */
const OLD_SEPIA = 'sepia';

function pick<T extends string>(allowed: Record<string, T>, value: unknown, fallback: T): T {
  return (Object.values(allowed) as unknown[]).includes(value) ? (value as T) : fallback;
}

function parseJson(raw: string | null): unknown {
  try {
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseSize(value: unknown): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= READER_TEXT_SIZE.Min &&
    value <= READER_TEXT_SIZE.Max
    ? value
    : READER_SETTINGS_DEFAULT.size;
}

/**
 * Reads stored reading settings; anything unknown falls back to the default, field by field. The
 * first version (size `s` / `m` / `l`, width `narrow` / `wide`, `tone` `app` / `sepia`) is
 * recognised by its string size and carried over: 16 / 18 / 20px, Normal / Wide, Sepia.
 */
export function parseReaderSettings(raw: string | null): ReaderSettings {
  const parsed = parseJson(raw);
  const value: Partial<Record<string, unknown>> =
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const old = typeof value['size'] === 'string';
  if (old) {
    return {
      ...READER_SETTINGS_DEFAULT,
      theme: value['tone'] === OLD_SEPIA ? READER_THEME.Sepia : null,
      font: pick(READER_FONT, value['font'], READER_SETTINGS_DEFAULT.font),
      size: OLD_SIZES[String(value['size'])] ?? READER_SETTINGS_DEFAULT.size,
      width: pick(
        READER_LINE_WIDTH,
        OLD_WIDTHS[String(value['width'])],
        READER_SETTINGS_DEFAULT.width,
      ),
    };
  }
  const theme = value['theme'];
  return {
    theme: (Object.values(READER_THEME) as unknown[]).includes(theme)
      ? pick(READER_THEME, theme, READER_THEME.Light)
      : null,
    font: pick(READER_FONT, value['font'], READER_SETTINGS_DEFAULT.font),
    size: parseSize(value['size']),
    lineSpacing: pick(
      READER_LINE_SPACING,
      value['lineSpacing'],
      READER_SETTINGS_DEFAULT.lineSpacing,
    ),
    width: pick(READER_LINE_WIDTH, value['width'], READER_SETTINGS_DEFAULT.width),
  };
}
