import type { SignInDriftMedia } from './sign-in-drift-media.type';

/** One saved-link card drifting around the sign-in card. */
export interface SignInDriftCard {
  /** Key part: `auth.signIn.tiles.<id>.title`. */
  readonly id: string;
  readonly domain: string;
  readonly letter: string;
  readonly media: SignInDriftMedia;
}
