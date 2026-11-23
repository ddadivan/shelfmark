import type { CARD_MEDIA } from './card-media.const';

/** One of `CARD_MEDIA`. */
export type CardMedia = (typeof CARD_MEDIA)[keyof typeof CARD_MEDIA];
