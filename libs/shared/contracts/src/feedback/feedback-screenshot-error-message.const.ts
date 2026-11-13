/** The `message` of a 400 from the screenshot route, shared by the API and the web mock. */
export const FEEDBACK_SCREENSHOT_ERROR_MESSAGE = {
  /** The message already has `FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax` screenshots. */
  TooMany: 'A message has at most 3 screenshots',
  /** More than `FEEDBACK_MESSAGE_LIMIT.ScreenshotAttachWindowMs` after the message was sent. */
  TooLate: 'Screenshots can only be added right after sending',
} as const;
