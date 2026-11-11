import type { TrashRetentionDays } from '../trash/trash-retention-days.type';
import type { CustomTheme } from './custom-theme.interface';
import type { MotionPreference } from './motion-preference.type';
import type { ThemePreference } from './theme-preference.type';

/** `GET /api/me/settings`: preferences kept on the account, so they follow the user to every device. */
export interface UserSettingsResponse {
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
  /** Settings › Appearance › Animations. Default `system`. */
  motion: MotionPreference;
  /**
   * False until `theme`, `customTheme` or `motion` is first written: the three fields then hold
   * the defaults, and the web app keeps (and saves once) an appearance the browser already had.
   */
  appearanceSaved: boolean;
}
