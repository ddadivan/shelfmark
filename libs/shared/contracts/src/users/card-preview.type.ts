import type { CARD_PREVIEW } from './card-preview.const';

/** One of `CARD_PREVIEW`. */
export type CardPreview = (typeof CARD_PREVIEW)[keyof typeof CARD_PREVIEW];
