import type { DENSITY } from './density.const';

/** One of `DENSITY`. */
export type Density = (typeof DENSITY)[keyof typeof DENSITY];
