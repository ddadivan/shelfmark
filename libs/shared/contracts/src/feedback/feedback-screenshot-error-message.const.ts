/** The `message` of a 400 or 429 from the screenshot route, shared by the API and the web mock. */
export const FEEDBACK_SCREENSHOT_ERROR_MESSAGE = {
  /** The message already has `FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax` screenshots. */
  TooMany: 'A message has at most 3 screenshots',
  /** More than `FEEDBACK_MESSAGE_LIMIT.ScreenshotAttachWindowMs` after the message was sent. */
  TooLate: 'Screenshots can only be added right after sending',
  /**
   * 429: the user's screenshots of the last 24 hours would pass
   * `FEEDBACK_MESSAGE_LIMIT.ScreenshotBytesPerDayMax` (`DemoScreenshotBytesPerDayMax` for demo).
   */
  DailyLimit: 'Screenshot limit reached for today, try again later',
} as const;
