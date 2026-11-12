import type { IconName } from '../../icon/models/icon-name.type';

/** One key cap of the toast shortcut hint: the key name, and an icon when it has a symbol. */
export interface ToastShortcutKey {
  /** Text drawn in the cap, and the key's name (Alt, Shift, T). */
  readonly label: string;
  /** Replaces the text with a symbol (command, option and shift signs the fonts do not have). */
  readonly icon?: IconName;
}
