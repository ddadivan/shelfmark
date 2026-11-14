import type { SignInDriftCard } from '../../sign-in-drift/models/sign-in-drift-card.interface';
import type { SignInDriftPlacement } from '../../sign-in-drift/models/sign-in-drift-placement.interface';

/** A desktop card with its spot in the phone strip. */
export interface SignInPhoneItem {
  readonly card: SignInDriftCard;
  readonly place: SignInDriftPlacement;
}
