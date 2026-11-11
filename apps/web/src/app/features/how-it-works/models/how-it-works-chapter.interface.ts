/** A chapter of the promo video: where it starts and its title (translation key). */
export interface HowItWorksChapter {
  readonly id: string;
  readonly titleKey: string;
  /** Start in seconds. */
  readonly start: number;
}
