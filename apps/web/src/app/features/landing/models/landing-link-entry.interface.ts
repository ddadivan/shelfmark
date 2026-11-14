/** A saved link of the demo, as shown in the folder lists of the "after" board. */
export interface LandingLinkEntry {
  readonly id: string;
  /** First letter of the site, shown in the favicon box. */
  readonly letter: string;
  /** Translation key of the link title. */
  readonly titleKey: string;
  /** Translation key of the note. */
  readonly noteKey: string;
}
