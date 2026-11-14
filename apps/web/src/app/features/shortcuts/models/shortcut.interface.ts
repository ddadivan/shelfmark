import type { ShortcutKey } from './shortcut-key.type';

/** One shortcut: what it does and the keys, pressed together or one after another. */
export interface Shortcut {
  /** Translation key of what it does. */
  labelKey: string;
  keys: readonly ShortcutKey[];
}
