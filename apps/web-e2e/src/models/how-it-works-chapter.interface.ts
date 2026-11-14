/** A chapter button of the "How it works" dialog: its title and start in each recording. */
export interface HowItWorksChapter {
  readonly title: string;
  /** The `m:ss` start in the desktop recording (desktop and tablet). */
  readonly desktop: string;
  /** The `m:ss` start in the phone recording. */
  readonly phone: string;
}
