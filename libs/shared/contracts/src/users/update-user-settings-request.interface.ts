import type { TrashRetentionDays } from '../trash/trash-retention-days.type';
import type { CustomTheme } from './custom-theme.interface';
import type { LanguageSettings } from './language-settings.interface';
import type { LayoutSettings } from './layout-settings.interface';
import type { LibrarySettings } from './library-settings.interface';
import type { MotionPreference } from './motion-preference.type';
import type { ThemePreference } from './theme-preference.type';

/** `PATCH /api/me/settings`: send only the fields to change; answers `UserSettingsResponse`. */
export interface UpdateUserSettingsRequest
  extends Partial<LibrarySettings>, Partial<LayoutSettings>, Partial<LanguageSettings> {
  /** One of `TRASH_RETENTION_DAYS`. */
  trashRetentionDays?: TrashRetentionDays;
  folderColours?: boolean;
  pauseHistory?: boolean;
  /** One of `THEME_PREFERENCE`. */
  theme?: ThemePreference;
  /** Always the whole custom theme (all four fields); `background` must belong to `base`. */
  customTheme?: CustomTheme;
  /** One of `MOTION_PREFERENCE`. */
  motion?: MotionPreference;
  /**
   * One of your live folders, or `null` for Unsorted. A foreign, missing or trashed folder is a
   * 404 and changes nothing.
   */
  newLinksFolderId?: string | null;
}
