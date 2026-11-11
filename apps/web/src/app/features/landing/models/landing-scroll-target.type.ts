import type { LANDING_SCROLL_TARGET } from './landing-scroll-target.const';

export type LandingScrollTarget =
  (typeof LANDING_SCROLL_TARGET)[keyof typeof LANDING_SCROLL_TARGET];
