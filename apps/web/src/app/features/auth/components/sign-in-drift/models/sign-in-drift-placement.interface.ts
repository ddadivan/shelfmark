/** Where and how one drifting card sits in its lane, from the seeded scatter (`layoutDriftLane`). */
export interface SignInDriftPlacement {
  /** Centre from the lane's outer edge (the window edge), as a share of the lane's width; below 0.5 card is partly off it. */
  readonly x: number;
  /** Centre from the lane's top, as a share of the lane's height. */
  readonly y: number;
  /** Size against the 240px base card (the layer's range, jittered). */
  readonly scale: number;
  /** Resting tilt in degrees. */
  readonly rotate: number;
  /** Order of the fly-in wave in the lane: 0 is the card nearest the sign-in card. */
  readonly wave: number;
  /** One float loop, in seconds. */
  readonly duration: number;
  /** Where in its loop the card starts, in seconds (negative: already under way). */
  readonly delay: number;
  /** Float amplitude, up and sideways, in pixels at scale 1. */
  readonly ampY: number;
  readonly ampX: number;
  /** Extra tilt at the top of the float, in degrees (either way). */
  readonly spin: number;
}
