import type { BADGE_TONE } from './badge-tone.const';

export type BadgeTone = (typeof BADGE_TONE)[keyof typeof BADGE_TONE];
