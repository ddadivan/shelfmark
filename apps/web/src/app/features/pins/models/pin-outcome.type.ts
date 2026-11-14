import type { PIN_OUTCOME } from './pin-outcome.const';

/** One of `PIN_OUTCOME`. */
export type PinOutcome = (typeof PIN_OUTCOME)[keyof typeof PIN_OUTCOME];
