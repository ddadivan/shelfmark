import type { CardField } from './card-field.type';

/** Which card fields a feed shows; a missing field is shown (the default). */
export type CardFields = Readonly<Partial<Record<CardField, boolean>>>;
