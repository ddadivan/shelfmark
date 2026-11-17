import type { RemindPreset } from './remind-preset.type';

/** One preset as offered right now: which one and the moment it stands for. */
export interface RemindOption {
  preset: RemindPreset;
  at: Date;
}
