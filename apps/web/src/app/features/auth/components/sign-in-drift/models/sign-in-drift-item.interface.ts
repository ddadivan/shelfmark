import type { SignInDriftCard } from './sign-in-drift-card.interface';
import type { SignInDriftPlacement } from './sign-in-drift-placement.interface';

/** A card with where it sits in the lane it is drawn in (a wide or a narrow layout). */
export interface SignInDriftItem {
  readonly card: SignInDriftCard;
  /** Spot, size, tilt, float and fly-in order, from the seeded scatter. */
  readonly place: SignInDriftPlacement;
  /** When its landing ring first pulses, in seconds: the cards take turns over one loop. */
  readonly ringDelay: number;
  /** Already translated tag names. */
  readonly tags: readonly string[];
}
