/**
 * A chapter of the promo video: its title (translation key) and where it starts in each
 * recording, in seconds (#330: the desktop and the phone video show different scenes).
 */
export interface HowItWorksChapter {
  readonly id: string;
  readonly titleKey: string;
  /** Start in the desktop recording, in seconds. */
  readonly desktop: number;
  /** Start in the phone recording, in seconds. */
  readonly phone: number;
}
