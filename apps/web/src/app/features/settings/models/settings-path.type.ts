import type { SETTINGS_PATH } from './settings-path.const';

export type SettingsPath = (typeof SETTINGS_PATH)[keyof typeof SETTINGS_PATH];
