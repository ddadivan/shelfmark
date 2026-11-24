import { READER_FONT, READER_LINE_WIDTH, READER_TEXT_SIZE, READER_TONE } from '@shelfmark/ui';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import type { ReaderSettings } from '../models/reader-settings.interface';

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

/** Reads stored reading settings; anything unknown falls back to the default, field by field. */
export function parseReaderSettings(raw: string | null): ReaderSettings {
  const parsed = parseJson(raw);
  const value =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as Partial<Record<keyof ReaderSettings, unknown>>)
      : {};
  return {
    size: pick(READER_TEXT_SIZE, value.size, READER_SETTINGS_DEFAULT.size),
    font: pick(READER_FONT, value.font, READER_SETTINGS_DEFAULT.font),
    width: pick(READER_LINE_WIDTH, value.width, READER_SETTINGS_DEFAULT.width),
    tone: pick(READER_TONE, value.tone, READER_SETTINGS_DEFAULT.tone),
  };
}
