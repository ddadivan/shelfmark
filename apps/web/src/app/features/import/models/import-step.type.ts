import type { IMPORT_STEP } from './import-step.const';

export type ImportStep = (typeof IMPORT_STEP)[keyof typeof IMPORT_STEP];
