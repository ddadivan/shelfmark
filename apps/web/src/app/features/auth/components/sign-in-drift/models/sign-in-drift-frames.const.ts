import type { SignInDriftFrame } from './sign-in-drift-frame.interface';

/**
 * Reference lanes: `huge` is about the lane of a 2560 x 1440 window with the larger sign-in card
 * (eleven cards a side, #350), `wide` is about the lane of a 1440 x 900 window (seven cards a side), `narrow`
 * the thin lane of a 1024 x 768 one (four a side). Changing a seed reshuffles that side's scatter;
 * the unit tests check every layout for overlaps. The wide seeds were picked again for the
 * fourteen cards of #315 (seven a side): the largest smallest gap between card centres and the
 * most even spread over the height among a few hundred tries.
 */
export const SIGN_IN_DRIFT_FRAMES = {
  wide: { width: 460, height: 850, seeds: [22_201_266, 33_807_464] },
  huge: { width: 900, height: 1300, seeds: [11_235_813, 21_347_655] },
  narrow: { width: 300, height: 820, seeds: [27_182_818, 16_180_339] },
} as const satisfies Record<string, SignInDriftFrame>;
