import type { DIALOG_HARNESS_SLOT } from './dialog-harness-slot.const';

/** One of `DIALOG_HARNESS_SLOT`. */
export type DialogHarnessSlot = (typeof DIALOG_HARNESS_SLOT)[keyof typeof DIALOG_HARNESS_SLOT];
