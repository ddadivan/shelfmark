/** A live link of the user on the offered site, newest first, as the offer check reads it. */
export interface RuleOfferCandidate {
  url: string;
  folderId: string | null;
  /** True while the link carries an open `auto-applied` folder suggestion (AI's choice, not the user's). */
  autoFiled: boolean;
}
