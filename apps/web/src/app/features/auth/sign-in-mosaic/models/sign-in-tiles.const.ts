import { SIGN_IN_TILE_MARK } from './sign-in-tile-mark.const';
import { SIGN_IN_TILE_TONE } from './sign-in-tile-tone.const';
import type { SignInTile } from './sign-in-tile.interface';

/** The eight tiles of the phone mosaic (docs/design/screens/MobileSignIn.dc.html), in grid order. */
export const SIGN_IN_TILES: readonly SignInTile[] = [
  { id: 'a', tone: SIGN_IN_TILE_TONE.AccentSoft, mark: SIGN_IN_TILE_MARK.None },
  { id: 'b', tone: SIGN_IN_TILE_TONE.Primary, mark: SIGN_IN_TILE_MARK.Square },
  { id: 'c', tone: SIGN_IN_TILE_TONE.Accent, mark: SIGN_IN_TILE_MARK.None },
  { id: 'd', tone: SIGN_IN_TILE_TONE.Accent, mark: SIGN_IN_TILE_MARK.None },
  { id: 'e', tone: SIGN_IN_TILE_TONE.AccentSoft, mark: SIGN_IN_TILE_MARK.Pills },
  { id: 'f', tone: SIGN_IN_TILE_TONE.Primary, mark: SIGN_IN_TILE_MARK.None },
  { id: 'g', tone: SIGN_IN_TILE_TONE.AccentSoft, mark: SIGN_IN_TILE_MARK.None },
  { id: 'h', tone: SIGN_IN_TILE_TONE.Muted, mark: SIGN_IN_TILE_MARK.None },
];
