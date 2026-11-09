import { SIGN_IN_TILE_MARK } from './sign-in-tile-mark.const';
import { SIGN_IN_TILE_TONE } from './sign-in-tile-tone.const';
import type { SignInTile } from './sign-in-tile.interface';

/** The eight example links of the sign-in mosaic (docs/design/screens/SignIn.dc.html). */
export const SIGN_IN_TILES: readonly SignInTile[] = [
  {
    id: 'signalForms',
    domain: 'youtube.com',
    letter: 'Y',
    tone: SIGN_IN_TILE_TONE.AccentSoft,
    mark: SIGN_IN_TILE_MARK.Pill,
  },
  {
    id: 'woolCoat',
    domain: 'cos.com',
    letter: 'C',
    tone: SIGN_IN_TILE_TONE.Primary,
    mark: SIGN_IN_TILE_MARK.Square,
  },
  {
    id: 'nestjs',
    domain: 'stepik.org',
    letter: 'S',
    tone: SIGN_IN_TILE_TONE.Accent,
    mark: SIGN_IN_TILE_MARK.None,
  },
  {
    id: 'ramen',
    domain: 'seriouseats.com',
    letter: 'R',
    tone: SIGN_IN_TILE_TONE.Accent,
    mark: SIGN_IN_TILE_MARK.Square,
  },
  {
    id: 'zoneless',
    domain: 'angular.dev',
    letter: 'A',
    tone: SIGN_IN_TILE_TONE.AccentSoft,
    mark: SIGN_IN_TILE_MARK.Pills,
  },
  {
    id: 'lisbon',
    domain: 'cntraveler.com',
    letter: 'L',
    tone: SIGN_IN_TILE_TONE.Primary,
    mark: SIGN_IN_TILE_MARK.Square,
  },
  {
    id: 'icons',
    domain: 'tabler.io',
    letter: 'T',
    tone: SIGN_IN_TILE_TONE.AccentSoft,
    mark: SIGN_IN_TILE_MARK.Pill,
  },
  {
    id: 'reacts',
    domain: 'overreacted.io',
    letter: 'O',
    tone: SIGN_IN_TILE_TONE.Muted,
    mark: SIGN_IN_TILE_MARK.None,
  },
];
