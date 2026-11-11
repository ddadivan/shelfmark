/** Feedback routes the web calls. */
export const FEEDBACK_ENDPOINT = {
  Prompt: '/api/feedback/prompt',
  Record: '/api/feedback',
  /** `GET` lists the user's messages, `POST` sends one (`SendFeedbackRequest`). */
  Messages: '/api/feedback/messages',
} as const;
