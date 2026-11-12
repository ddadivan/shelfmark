/**
 * A stretch of the raw recording the final video leaves out (a page load between two scenes), in
 * milliseconds from the first kept frame of the raw recording.
 */
export interface PromoCut {
  readonly start: number;
  readonly end: number;
}
