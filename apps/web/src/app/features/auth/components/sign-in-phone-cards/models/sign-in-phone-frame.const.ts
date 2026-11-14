import type { SignInDriftFrame } from '../../sign-in-drift/models/sign-in-drift-frame.interface';

/**
 * The strip on top of the phone and tablet sign-in as a reference frame (CSS pixels at a card
 * scale of 1): 360px, the narrowest phone, by 240px: the 300px band less 60px, so the cards that hang a little
 * over the lane's bottom edge (and float) stay above the band's line. A wider band only spreads the
 * cards further apart. One seed: changing it reshuffles the scatter; the unit test checks it.
 */
export const SIGN_IN_PHONE_FRAME = {
  width: 360,
  height: 240,
  seeds: [20_261_114, 20_261_114],
} as const satisfies SignInDriftFrame;
