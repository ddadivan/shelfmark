/**
 * Limits of a feedback message: text length, screenshot size in bytes (before base64), the length
 * of each client info string, messages per user per hour, and messages a list returns.
 */
export const FEEDBACK_MESSAGE_LIMIT = {
  TextMax: 2000,
  ScreenshotMaxBytes: 2 * 1024 * 1024,
  ClientInfoMax: 300,
  PerHourMax: 10,
  ListMax: 100,
} as const;
