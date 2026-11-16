/** Feedback routes the web calls. */
export const FEEDBACK_ENDPOINT = {
  Prompt: '/api/feedback/prompt',
  Record: '/api/feedback',
  /** `POST` counts one display of the rating prompt (`RecordRatingPromptViewRequest`); 204. */
  RatingPromptViews: '/api/feedback/rating-prompt/views',
  /**
   * `GET` lists the user's messages, `POST` sends one (`SendFeedbackRequest`). Screenshots go to
   * `feedbackScreenshotsPath(id)`, one per request.
   */
  Messages: '/api/feedback/messages',
} as const;
