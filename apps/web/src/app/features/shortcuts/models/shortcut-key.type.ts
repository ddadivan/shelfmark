import type { SHORTCUT_KEY } from './shortcut-key.const';

export type ShortcutKey = (typeof SHORTCUT_KEY)[keyof typeof SHORTCUT_KEY];
