import {
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isCustomTheme,
  isMotionPreference,
  isThemePreference,
  type CustomTheme,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import type { AppearanceRow } from './models/appearance-row.interface';

/**
 * Reads the appearance part of the settings. The CHECKs keep the columns valid; a value that
 * still slips through (a hand edit) falls back to the default instead of reaching the client.
 */
export function toAppearanceSettings(
  row: AppearanceRow,
): Pick<UserSettingsResponse, 'theme' | 'customTheme' | 'motion' | 'appearanceSaved'> {
  const customTheme: unknown = {
    base: row.customThemeBase,
    accent: row.customThemeAccent,
    background: row.customThemeBackground,
    corners: row.customThemeCorners,
  };
  return {
    theme: isThemePreference(row.theme) ? row.theme : THEME_PREFERENCE.System,
    customTheme: isCustomTheme(customTheme) ? customTheme : { ...CUSTOM_THEME_DEFAULT },
    motion: isMotionPreference(row.motion) ? row.motion : MOTION_PREFERENCE.System,
    appearanceSaved: row.appearanceSavedAt !== null,
  };
}

/** The columns to write for a whole custom theme. */
export function customThemeColumns(
  theme: CustomTheme,
): Omit<AppearanceRow, 'theme' | 'motion' | 'appearanceSavedAt'> {
  return {
    customThemeBase: theme.base,
    customThemeAccent: theme.accent,
    customThemeBackground: theme.background,
    customThemeCorners: theme.corners,
  };
}
