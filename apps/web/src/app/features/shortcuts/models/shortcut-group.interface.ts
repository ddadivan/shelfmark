import type { Shortcut } from './shortcut.interface';

/** Shortcuts that belong together: one panel of the settings page, one column of the dialog. */
export interface ShortcutGroup {
  id: string;
  /** Translation key of the group name. */
  titleKey: string;
  shortcuts: readonly Shortcut[];
}
