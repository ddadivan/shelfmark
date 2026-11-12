import type { SIGN_IN_TILE_TONE } from './sign-in-tile-tone.const';

export type SignInTileTone = (typeof SIGN_IN_TILE_TONE)[keyof typeof SIGN_IN_TILE_TONE];
