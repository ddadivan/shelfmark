/** Why a chosen file is not accepted as a screenshot of a feedback message. */
export const FEEDBACK_SCREENSHOT_ERROR = {
  /** Not a PNG, JPEG or WebP image. */
  Type: 'type',
  /** Larger than `FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes`. */
  Size: 'size',
  /** Zero bytes. */
  Empty: 'empty',
  /** The browser could not read the file. */
  Read: 'read',
  /** More files than the `FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax` places left. */
  Count: 'count',
} as const;
