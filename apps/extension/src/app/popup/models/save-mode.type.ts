import type { SAVE_MODE } from './save-mode.const';

export type SaveMode = (typeof SAVE_MODE)[keyof typeof SAVE_MODE];
