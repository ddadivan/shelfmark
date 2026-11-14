import { APP_FONT } from './app-font.const';
import type { AppFont } from './app-font.type';
import { CARD_PREVIEW } from './card-preview.const';
import type { CardPreview } from './card-preview.type';
import { DENSITY } from './density.const';
import type { Density } from './density.type';
import type { LayoutSettings } from './layout-settings.interface';
import { TEXT_SIZE } from './text-size.const';
import type { TextSize } from './text-size.type';

const LAYOUT_KEYS = 'cardNotes,cardPreview,cardSite,cardTags,density,font,textSize';

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isTextSize(value: unknown): value is TextSize {
  return isOneOf(Object.values(TEXT_SIZE), value);
}

export function isAppFont(value: unknown): value is AppFont {
  return isOneOf(Object.values(APP_FONT), value);
}

export function isDensity(value: unknown): value is Density {
  return isOneOf(Object.values(DENSITY), value);
}

export function isCardPreview(value: unknown): value is CardPreview {
  return isOneOf(Object.values(CARD_PREVIEW), value);
}

/** A whole, valid `LayoutSettings` with no other keys (what the web stores for the first paint). */
export function isLayoutSettings(value: unknown): value is LayoutSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).sort().join(',') === LAYOUT_KEYS &&
    isTextSize(record['textSize']) &&
    isAppFont(record['font']) &&
    isDensity(record['density']) &&
    isCardPreview(record['cardPreview']) &&
    typeof record['cardSite'] === 'boolean' &&
    typeof record['cardNotes'] === 'boolean' &&
    typeof record['cardTags'] === 'boolean'
  );
}
