import { CUSTOM_THEME_ACCENT } from './custom-theme-accent.const';
import { CUSTOM_THEME_BACKGROUNDS } from './custom-theme-backgrounds.const';
import { CUSTOM_THEME_BASE } from './custom-theme-base.const';
import { CUSTOM_THEME_CORNERS } from './custom-theme-corners.const';
import type { CustomTheme } from './custom-theme.interface';
import { isHexColour } from './is-hex-colour';
import { MOTION_PREFERENCE } from './motion-preference.const';
import type { MotionPreference } from './motion-preference.type';
import { THEME_PREFERENCE } from './theme-preference.const';
import type { ThemePreference } from './theme-preference.type';

const CUSTOM_THEME_KEYS = 'accent,background,base,corners';

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return isOneOf(Object.values(THEME_PREFERENCE), value);
}

export function isMotionPreference(value: unknown): value is MotionPreference {
  return isOneOf(Object.values(MOTION_PREFERENCE), value);
}

/** True when `background` is one of the backgrounds of `base` (`CUSTOM_THEME_BACKGROUNDS`) or an own `#rrggbb`. */
export function isBackgroundOfBase(base: unknown, background: unknown): boolean {
  // An own background colour (#335) fits any base; the app draws a readable shade of it.
  return (
    (isOneOf(Object.values(CUSTOM_THEME_BASE), base) && isHexColour(background)) ||
    (isOneOf(Object.values(CUSTOM_THEME_BASE), base) &&
      isOneOf(CUSTOM_THEME_BACKGROUNDS[base], background))
  );
}

/**
 * A complete, valid `CustomTheme` with no other keys: the allow-lists (an accent may also be an
 * own `#rrggbb` colour) plus the background-of-base rule. Checks stored copies (browser storage) and database rows.
 */
export function isCustomTheme(value: unknown): value is CustomTheme {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  if (Object.keys(value).sort().join() !== CUSTOM_THEME_KEYS) {
    return false;
  }
  const theme = value as Record<string, unknown>;
  return (
    (isOneOf(Object.values(CUSTOM_THEME_ACCENT), theme['accent']) ||
      isHexColour(theme['accent'])) &&
    isOneOf(Object.values(CUSTOM_THEME_CORNERS), theme['corners']) &&
    isBackgroundOfBase(theme['base'], theme['background'])
  );
}
