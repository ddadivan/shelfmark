/** What the author is editing on one message: the status choice and the reply text. */
export interface AdminFeedbackDraft {
  /** A `FeedbackStatus` value, or `null` while the select has none. */
  status: string | null;
  reply: string;
}
