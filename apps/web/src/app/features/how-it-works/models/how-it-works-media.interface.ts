/** The promo files the dialog plays: the recording for the current theme and device. */
export interface HowItWorksMedia {
  readonly mp4: string;
  readonly webm: string;
  readonly poster: string;
  readonly captions: string;
  /** The portrait phone recording (it gets a taller frame). */
  readonly phone: boolean;
}
