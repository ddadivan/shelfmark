import type { SignInDriftLayer } from './sign-in-drift-layer.type';
import type { SignInDriftSide } from './sign-in-drift-side.type';

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
  /** Column of the lane's two: 0 is the outer one (at the window edge), 1 the inner one. */
  readonly column: number;
  /** First row of the six the lane is split into; a card takes two of them. */
  readonly row: number;
  /** Row (1 to 3) in a narrow desktop's single column of three cards; `null` leaves the card out there. */
  readonly narrowRow: number | null;
  /** The order of the fly-in wave: the cards nearest the sign-in card go first. */
  readonly wave: number;
  /** Resting tilt in degrees. */
  readonly rotate: number;
}
