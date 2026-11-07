import type { LANDING_REVEAL_STATE } from './landing-reveal-state.const';

export type LandingRevealState = (typeof LANDING_REVEAL_STATE)[keyof typeof LANDING_REVEAL_STATE];
