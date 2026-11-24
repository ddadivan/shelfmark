import type { ReaderPreferences, UpdateUserSettingsRequest } from '@shelfmark/contracts';
import type { ReaderSettings } from '../models/reader-settings.interface';

/** The account's reading settings (`/api/me/settings`) as Reader's settings. */
export function readerSettingsOf(preferences: ReaderPreferences): ReaderSettings {
  return {
    theme: preferences.readerTheme,
    font: preferences.readerFont,
    size: preferences.readerSize,
    lineSpacing: preferences.readerLineSpacing,
    width: preferences.readerLineWidth,
  };
}

/** The settings update for a change of Reader's settings (only the fields changed). */
export function readerPreferencesOf(change: Partial<ReaderSettings>): UpdateUserSettingsRequest {
  const request: UpdateUserSettingsRequest = {};
  if (change.theme !== undefined) request.readerTheme = change.theme;
  if (change.font !== undefined) request.readerFont = change.font;
  if (change.size !== undefined) request.readerSize = change.size;
  if (change.lineSpacing !== undefined) request.readerLineSpacing = change.lineSpacing;
  if (change.width !== undefined) request.readerLineWidth = change.width;
  return request;
}
