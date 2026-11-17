import type { SignInCardLayer } from './sign-in-card-layer.type';

/** One saved-link card of the sign-in strip, with its fixed spot and float in the 360 x 236 strip. */
export interface SignInCard {
  /** Translation key part: `popup.signedOut.cards.<id>`. */
  readonly id: string;
  readonly host: string;
  readonly daysAgo: number;
  readonly tags: readonly string[];
  readonly tone: number;
  readonly layer: SignInCardLayer;
  /** Top-left spot in px of the strip; `scale` of the 240px base card. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** Rest tilt and extra tilt at the top of the float, in degrees. */
  readonly rotate: number;
  readonly spin: number;
  /** Float loop length and phase in seconds; drift in px. */
  readonly duration: number;
  readonly delay: number;
  readonly ampX: number;
  readonly ampY: number;
  /** Order of the fly-in wave. */
  readonly wave: number;
}
