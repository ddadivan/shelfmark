/** What `localStorage` keeps per user for the "How it works" card. */
export interface HowItWorksState {
  /** ISO time the account was first seen on this device. */
  readonly firstSeen: string;
  /** The video was opened or the card hidden: the card never shows again. */
  readonly done: boolean;
}
