import type { DATE_FORMAT } from './date-format.const';

/** One of `DATE_FORMAT`. */
export type DateFormat = (typeof DATE_FORMAT)[keyof typeof DATE_FORMAT];
