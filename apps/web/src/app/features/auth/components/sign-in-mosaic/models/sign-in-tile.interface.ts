import type { SignInTileMark } from './sign-in-tile-mark.type';
import type { SignInTileTone } from './sign-in-tile-tone.type';

/** One decorative tile of the phone mosaic: a coloured block with an optional small mark. */
export interface SignInTile {
  readonly id: string;
  readonly tone: SignInTileTone;
  readonly mark: SignInTileMark;
}
