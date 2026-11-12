import type { SETTINGS_ROW_ALIGN } from './settings-row-align.const';

export type SettingsRowAlign = (typeof SETTINGS_ROW_ALIGN)[keyof typeof SETTINGS_ROW_ALIGN];
