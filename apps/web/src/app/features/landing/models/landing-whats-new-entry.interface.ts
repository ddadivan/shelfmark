/** One line of "What's new" on `/about`: when it shipped and what it is (translation keys). */
export interface LandingWhatsNewEntry {
  readonly id: string;
  /** ISO date (yyyy-mm-dd) of the release that brought it. */
  readonly date: string;
  readonly titleKey: string;
  readonly textKey: string;
}
