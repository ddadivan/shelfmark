import {
  isAppFont,
  isCardPreview,
  isCustomTheme,
  isDateFormat,
  isDensity,
  isFolderEmoji,
  isHexColour,
  isInterfaceLanguage,
  isLibrarySort,
  isLibraryView,
  isLinkOpenTarget,
  isMotionPreference,
  isTextSize,
  isThemePreference,
  isTimeFormat,
  isWeekStart,
  TRASH_RETENTION_DAYS,
  USER_LIMIT,
} from '@shelfmark/contracts';

type Check = (value: unknown) => boolean;

const isFlag: Check = (value) => typeof value === 'boolean';

/** The fields `PATCH /api/me/settings` accepts and what each may hold (the API's `UpdateUserSettingsDto`). */
const FIELD_CHECKS: Readonly<Record<string, Check>> = {
  trashRetentionDays: (value) =>
    typeof value === 'number' && (TRASH_RETENTION_DAYS as readonly number[]).includes(value),
  folderColours: isFlag,
  pauseHistory: isFlag,
  theme: isThemePreference,
  customTheme: isCustomTheme,
  customColours: (value) =>
    Array.isArray(value) &&
    value.length <= USER_LIMIT.CustomColoursMax &&
    value.every((colour) => isHexColour(colour)),
  customEmoji: (value) =>
    Array.isArray(value) &&
    value.length <= USER_LIMIT.CustomEmojiMax &&
    new Set(value).size === value.length &&
    value.every((emoji) => isFolderEmoji(emoji)),
  motion: isMotionPreference,
  textSize: isTextSize,
  font: isAppFont,
  density: isDensity,
  cardPreview: isCardPreview,
  cardSite: isFlag,
  cardNotes: isFlag,
  cardTags: isFlag,
  defaultView: isLibraryView,
  defaultSort: isLibrarySort,
  openLinksIn: isLinkOpenTarget,
  showFolderCounts: isFlag,
  fetchPreviews: isFlag,
  newLinksFolderId: (value) => value === null || typeof value === 'string',
  language: isInterfaceLanguage,
  dateFormat: isDateFormat,
  timeFormat: isTimeFormat,
  weekStart: isWeekStart,
};

/**
 * What the API's validation of a settings update refuses: a field it does not know and a value
 * outside the field's allow-list, type or limit. Empty list: valid.
 */
export function settingsRequestProblems(request: object): string[] {
  const problems: string[] = [];
  for (const [field, value] of Object.entries(request)) {
    const check = FIELD_CHECKS[field];
    if (check === undefined) {
      problems.push(`property ${field} should not exist`);
    } else if (value !== undefined && !check(value)) {
      problems.push(`${field} is not valid`);
    }
  }
  return problems;
}
