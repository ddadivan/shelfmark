import type { SignInDriftFrame } from './sign-in-drift-frame.interface';

/**
 * Reference lanes: `wide` is about the lane of a 1440 x 900 window (eight cards a side), `narrow`
 * the thin lane of a 1024 x 768 one (four a side). Changing a seed reshuffles that side's scatter;
 * the unit tests check every layout for overlaps.
 */
export const SIGN_IN_DRIFT_FRAMES = {
  wide: { width: 460, height: 850, seeds: [20_261_111, 31_415_926] },
  narrow: { width: 300, height: 820, seeds: [27_182_818, 16_180_339] },
} as const satisfies Record<string, SignInDriftFrame>;
