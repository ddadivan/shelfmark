import type { RADIO_OPTION_TONE } from './radio-option-tone.const';

/** A `ui-radio-group` option tone (`RADIO_OPTION_TONE`). */
export type RadioOptionTone = (typeof RADIO_OPTION_TONE)[keyof typeof RADIO_OPTION_TONE];
