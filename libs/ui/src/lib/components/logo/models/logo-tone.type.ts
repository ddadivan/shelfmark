import type { LOGO_TONE } from './logo-tone.const';

/**
 * `color` is graphite and sage, and follows the theme: the light mark on light grounds, the
 * dark mark on dark. `mono` is one colour (`currentColor`) with the bookmark cut out.
 */
export type LogoTone = (typeof LOGO_TONE)[keyof typeof LOGO_TONE];
