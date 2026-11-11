import type { SignInDriftCard } from './sign-in-drift-card.interface';

/** A card with where it sits in the lane it is drawn in (a wide or a narrow layout). */
export interface SignInDriftItem {
  readonly card: SignInDriftCard;
  /** Position in the whole set, for the order in which the landing rings take turns. */
  readonly index: number;
  /** CSS grid column (1-based) of the lane. */
  readonly column: number;
  /** CSS grid row (1-based) of the lane. */
  readonly row: number;
  /** How many rows it takes. */
  readonly span: number;
  /** 0 at the window edge, 1 next to the sign-in card; how far out the fly-in starts. */
  readonly outer: number;
  /** Where the card's centre is, from the top, as a share of the lane's height (0 to 1). */
  readonly centreY: number;
  /** Already translated tag names. */
  readonly tags: readonly string[];
}
