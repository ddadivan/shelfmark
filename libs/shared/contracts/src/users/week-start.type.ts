import type { WEEK_START } from './week-start.const';

/** One of `WEEK_START`. */
export type WeekStart = (typeof WEEK_START)[keyof typeof WEEK_START];
