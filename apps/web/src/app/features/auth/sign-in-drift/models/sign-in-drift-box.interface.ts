import type { SignInDriftLayer } from './sign-in-drift-layer.type';

/** A card's box in the reference frame of `layoutDriftLane`: centre and the size of its tilted outline. */
export interface SignInDriftBox {
  readonly layer: SignInDriftLayer;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
