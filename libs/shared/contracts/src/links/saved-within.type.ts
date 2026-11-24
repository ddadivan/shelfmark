import type { SAVED_WITHIN } from './saved-within.const';

/** One of `SAVED_WITHIN`. */
export type SavedWithin = (typeof SAVED_WITHIN)[keyof typeof SAVED_WITHIN];
