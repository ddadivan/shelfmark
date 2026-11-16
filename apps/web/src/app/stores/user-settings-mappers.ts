import type { LanguageSettings, LibrarySettings, UserSettingsResponse } from '@shelfmark/contracts';
import type { Appearance } from '../core/theme/models/appearance.type';

/** The appearance part of a settings response. */
export function appearanceOf(settings: UserSettingsResponse): Appearance {
  return {
    theme: settings.theme,
    customTheme: settings.customTheme,
    motion: settings.motion,
    textSize: settings.textSize,
    font: settings.font,
    density: settings.density,
    cardPreview: settings.cardPreview,
    cardSite: settings.cardSite,
    cardNotes: settings.cardNotes,
    cardTags: settings.cardTags,
  };
}

/** The Settings › Language part of a settings response. */
export function languageOf(settings: UserSettingsResponse): LanguageSettings {
  return {
    language: settings.language,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    weekStart: settings.weekStart,
  };
}

export function sameLanguage(a: LanguageSettings, b: LanguageSettings): boolean {
  return (
    a.language === b.language &&
    a.dateFormat === b.dateFormat &&
    a.timeFormat === b.timeFormat &&
    a.weekStart === b.weekStart
  );
}

/** The Settings › Library part of a settings response. */
export function libraryOf(settings: UserSettingsResponse): LibrarySettings {
  return {
    defaultView: settings.defaultView,
    defaultSort: settings.defaultSort,
    openLinksIn: settings.openLinksIn,
    showFolderCounts: settings.showFolderCounts,
    newLinksFolderId: settings.newLinksFolderId,
    fetchPreviews: settings.fetchPreviews,
  };
}

export function sameAppearance(a: Appearance, b: Appearance): boolean {
  return (
    a.theme === b.theme &&
    a.motion === b.motion &&
    a.textSize === b.textSize &&
    a.font === b.font &&
    a.density === b.density &&
    a.cardPreview === b.cardPreview &&
    a.cardSite === b.cardSite &&
    a.cardNotes === b.cardNotes &&
    a.cardTags === b.cardTags &&
    a.customTheme.base === b.customTheme.base &&
    a.customTheme.accent === b.customTheme.accent &&
    a.customTheme.background === b.customTheme.background &&
    a.customTheme.corners === b.customTheme.corners
  );
}

/** `item` at the end of `list`, once (an old copy moves to the end), at most `max` (the oldest go). */
export function appended<T>(list: readonly T[], item: T, max: number): T[] {
  return [...list.filter((entry) => entry !== item), item].slice(-max);
}
