/** The date a message was sent: "today" is worded by the caller, any other day is formatted. */
export interface FeedbackSentDate {
  today: boolean;
  /** "3 Nov", or "3 Nov 2025" for another year. */
  text: string;
}
