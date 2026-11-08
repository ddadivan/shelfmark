/** One message of the "Saved Messages" demo chat: a short text and a link. */
export interface LandingChatMessage {
  readonly id: string;
  /** Translation key of the message text. */
  readonly textKey: string;
  /** Translation key of the day and time. */
  readonly timeKey: string;
  readonly letter: string;
  /** Domain and path as shown in the chat; not a real link. */
  readonly url: string;
}
