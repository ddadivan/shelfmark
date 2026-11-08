/** A saved link of the demo, as shown on the shelf (hero) and in the folder lists. */
export interface LandingLinkEntry {
  readonly id: string;
  /** First letter of the site, shown in the favicon box. */
  readonly letter: string;
  /** Translation key of the link title. */
  readonly titleKey: string;
  /** Translation key of the note. */
  readonly noteKey: string;
}
