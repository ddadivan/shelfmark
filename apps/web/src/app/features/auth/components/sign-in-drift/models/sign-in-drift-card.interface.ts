import type { SignInDriftLayer } from './sign-in-drift-layer.type';
import type { SignInDriftSide } from './sign-in-drift-side.type';
import type { SignInDriftTier } from './sign-in-drift-tier.type';

/** One saved-link card drifting in a side lane of the sign-in page. */
export interface SignInDriftCard {
  /** Key part: `auth.signIn.tiles.<id>.title`. */
  readonly id: string;
  readonly host: string;
  /** Days since it was saved; the card shows "2 days ago", "Last week" or a date. */
  readonly daysAgo: number;
  /** Key parts of `auth.signIn.tags.<tag>`. */
  readonly tags: readonly string[];
  /** Which of the three soft preview backgrounds the drawing sits on (0 to 2). */
  readonly tone: number;
  readonly layer: SignInDriftLayer;
  readonly side: SignInDriftSide;
  /** The smallest layout that draws it: `narrow` cards are on every desktop, `huge` ones only from 160em. */
  readonly tier: SignInDriftTier;
}
