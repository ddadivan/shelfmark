import type { REMIND_PRESET } from './remind-preset.const';

export type RemindPreset = (typeof REMIND_PRESET)[keyof typeof REMIND_PRESET];
