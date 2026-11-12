/**
 * The reference box one side lane is laid out in, in CSS pixels at a card scale of 1. The real
 * lane is scaled to it uniformly (by the smaller of its two ratios), so a layout without overlaps
 * here has none in any window: the other axis only spreads the cards further apart.
 */
export interface SignInDriftFrame {
  readonly width: number;
  readonly height: number;
  /** Seed of the jitter for each side (start, end): the same scatter on every visit and build. */
  readonly seeds: readonly [number, number];
}
