import type { SettingsPath } from './settings-path.type';

/** One section of the settings: a row of the desktop nav and, where `phone` is set, of the You list. */
export interface SettingsNavEntry {
  path: SettingsPath;
  /** Translation key of the section name (nav row and page title). */
  labelKey: string;
  /** Translation key of the line under the page title. */
  descriptionKey: string;
  /**
   * Listed in the You tab. The account is the card on top of that list, and the keyboard
   * shortcuts are of no use on a touch screen.
   */
  phone: boolean;
}
