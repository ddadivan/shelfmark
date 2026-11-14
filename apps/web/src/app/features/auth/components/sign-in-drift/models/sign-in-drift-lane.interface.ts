import type { SignInDriftFrame } from './sign-in-drift-frame.interface';
import type { SignInDriftItem } from './sign-in-drift-item.interface';
import type { SignInDriftSide } from './sign-in-drift-side.type';

/** The cards of one side lane and the reference frame their spots are shares of. */
export interface SignInDriftLane {
  readonly side: SignInDriftSide;
  readonly frame: SignInDriftFrame;
  readonly cards: readonly SignInDriftItem[];
}
