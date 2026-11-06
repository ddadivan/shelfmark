import type { RADIO_ORIENTATION } from './radio-orientation.const';

/** Layout of the options: stacked (default) or side by side. */
export type RadioOrientation = (typeof RADIO_ORIENTATION)[keyof typeof RADIO_ORIENTATION];
