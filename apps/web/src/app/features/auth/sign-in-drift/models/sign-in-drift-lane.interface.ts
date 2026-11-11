import type { SignInDriftItem } from './sign-in-drift-item.interface';
import type { SignInDriftSide } from './sign-in-drift-side.type';

/** The cards of one side lane. */
export interface SignInDriftLane {
  readonly side: SignInDriftSide;
  readonly cards: readonly SignInDriftItem[];
}
