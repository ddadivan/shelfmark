import type { CARD_HARNESS_SLOT } from './card-harness-slot.const';

/** One of `CARD_HARNESS_SLOT`. */
export type CardHarnessSlot = (typeof CARD_HARNESS_SLOT)[keyof typeof CARD_HARNESS_SLOT];
