import {
  CUSTOM_THEME_DEFAULT,
  LAYOUT_SETTINGS_DEFAULT,
  isAppFont,
  isCardPreview,
  isDensity,
  isTextSize,
  type LayoutSettings,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  isCustomTheme,
  isFolderEmoji,
  isHexColour,
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
): Pick<
  UserSettingsResponse,
  'theme' | 'customTheme' | 'motion' | 'appearanceSaved' | 'customColours' | 'customEmoji'
> &
  LayoutSettings {
  const d = LAYOUT_SETTINGS_DEFAULT;
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
    customColours: row.customColours.filter(isHexColour),
    customEmoji: row.customEmoji.filter(isFolderEmoji),
    textSize: isTextSize(row.textSize) ? row.textSize : d.textSize,
    font: isAppFont(row.font) ? row.font : d.font,
    density: isDensity(row.density) ? row.density : d.density,
    cardPreview: isCardPreview(row.cardPreview) ? row.cardPreview : d.cardPreview,
    cardSite: row.cardSite,
    cardNotes: row.cardNotes,
    cardTags: row.cardTags,
  };
}

/** The columns to write for a whole custom theme. */
export function customThemeColumns(
  theme: CustomTheme,
): Pick<
  AppearanceRow,
  'customThemeBase' | 'customThemeAccent' | 'customThemeBackground' | 'customThemeCorners'
> {
  return {
    customThemeBase: theme.base,
    customThemeAccent: theme.accent,
    customThemeBackground: theme.background,
    customThemeCorners: theme.corners,
  };
}
