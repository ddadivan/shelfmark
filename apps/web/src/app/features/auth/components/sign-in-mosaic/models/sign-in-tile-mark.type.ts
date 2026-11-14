import type { SIGN_IN_TILE_MARK } from './sign-in-tile-mark.const';

export type SignInTileMark = (typeof SIGN_IN_TILE_MARK)[keyof typeof SIGN_IN_TILE_MARK];
