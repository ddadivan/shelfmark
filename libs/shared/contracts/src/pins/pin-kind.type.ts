import type { PIN_KIND } from './pin-kind.const';

/** One of `PIN_KIND`. */
export type PinKind = (typeof PIN_KIND)[keyof typeof PIN_KIND];
