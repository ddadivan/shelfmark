import type { SavedWithin } from './saved-within.type';

/** The days each `SAVED_WITHIN` value reaches back from now. */
export const SAVED_WITHIN_DAYS: Readonly<Record<SavedWithin, number>> = {
  week: 7,
  month: 30,
};
