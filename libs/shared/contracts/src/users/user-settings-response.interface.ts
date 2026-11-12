import type { TrashRetentionDays } from '../trash/trash-retention-days.type';
import type { CustomTheme } from './custom-theme.interface';
import type { HexColour } from './hex-colour.type';
import type { LanguageSettings } from './language-settings.interface';
import type { LayoutSettings } from './layout-settings.interface';
import type { LibrarySettings } from './library-settings.interface';
import type { MotionPreference } from './motion-preference.type';
import type { ThemePreference } from './theme-preference.type';

/** `GET /api/me/settings`: preferences kept on the account, so they follow the user to every device. */
export interface UserSettingsResponse extends LibrarySettings, LayoutSettings, LanguageSettings {
  trashRetentionDays: TrashRetentionDays;
  /** Coloured folder icons; off shows every folder in graphite. Default on. */
  folderColours: boolean;
  /**
   * "Pause history" on Recently opened: while on, `POST /api/links/:id/open` answers but records
   * nothing (`recorded: false`). Default off.
   */
  pauseHistory: boolean;
  /** Settings › Appearance › Theme. Default `system`. */
  theme: ThemePreference;
  /** The Custom theme; kept while another theme is chosen. Default `CUSTOM_THEME_DEFAULT`. */
  customTheme: CustomTheme;
  /**
   * Own colours (`#rrggbb`, newest last, at most `USER_LIMIT.CustomColoursMax`): offered as
   * swatches next to the built-in ones in the folder style dialog and the Custom theme (#335).
   */
  customColours: HexColour[];
  /** Settings › Appearance › Animations. Default `system`. */
  motion: MotionPreference;
  /**
   * False until `theme`, `customTheme`, `motion` or a `LayoutSettings` field is first written:
   * they then hold the defaults, and the web app keeps (and saves once) an appearance the browser
   * already had.
   */
  appearanceSaved: boolean;
  /**
   * False until a `LanguageSettings` field is first written: they then hold the defaults, and the
   * web app keeps (and saves once) a language the browser already had (a guest's choice).
   */
  languageSaved: boolean;
}
