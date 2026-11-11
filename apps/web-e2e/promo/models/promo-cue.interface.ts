/** A caption cue as measured during the run, in milliseconds from the start of the video. */
export interface PromoCue {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}
