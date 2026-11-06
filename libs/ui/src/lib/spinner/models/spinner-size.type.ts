import type { SPINNER_SIZE } from './spinner-size.const';

/** Spinner diameter: 12px (`sm`: statuses, load-more), 16px (`md`: buttons, fields) or 24px. */
export type SpinnerSize = (typeof SPINNER_SIZE)[keyof typeof SPINNER_SIZE];
