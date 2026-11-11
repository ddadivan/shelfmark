/** Why a chosen file is not accepted as the screenshot of a feedback message. */
export const FEEDBACK_SCREENSHOT_ERROR = {
  /** Not a PNG, JPEG or WebP image. */
  Type: 'type',
  /** Larger than `FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes`. */
  Size: 'size',
  /** Zero bytes. */
  Empty: 'empty',
  /** The browser could not read the file. */
  Read: 'read',
} as const;
