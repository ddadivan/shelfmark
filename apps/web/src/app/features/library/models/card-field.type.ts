import type { CARD_FIELD } from './card-field.const';

export type CardField = (typeof CARD_FIELD)[keyof typeof CARD_FIELD];
