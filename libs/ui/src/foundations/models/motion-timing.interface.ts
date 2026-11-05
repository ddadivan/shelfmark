/** One row of the Motion timing table (docs/design/components/Motion/README.md). */
export interface MotionTiming {
  readonly moment: string;
  readonly moves: string;
  readonly timing: string;
  /** Sass preset that implements it, or an empty string when it is component-specific. */
  readonly mixin: string;
}
