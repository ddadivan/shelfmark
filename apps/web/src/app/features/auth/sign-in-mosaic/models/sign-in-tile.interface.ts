import type { SignInTileMark } from './sign-in-tile-mark.type';
import type { SignInTileTone } from './sign-in-tile-tone.type';

/** One decorative tile: a coloured front and, on the back, an example saved link. */
export interface SignInTile {
  /** Key part: `auth.signIn.tiles.<id>.title` and `.note`. */
  readonly id: string;
  readonly domain: string;
  readonly letter: string;
  readonly tone: SignInTileTone;
  readonly mark: SignInTileMark;
}
