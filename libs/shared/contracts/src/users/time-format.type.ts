import type { TIME_FORMAT } from './time-format.const';

/** One of `TIME_FORMAT`. */
export type TimeFormat = (typeof TIME_FORMAT)[keyof typeof TIME_FORMAT];
