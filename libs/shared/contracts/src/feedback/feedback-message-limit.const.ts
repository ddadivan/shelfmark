/**
 * Limits of a feedback message: text length, the size of each screenshot in bytes (before base64),
 * screenshots per message, how long after sending they can be attached, the screenshot bytes a
 * user may store per rolling 24 hours (lower for the demo account), the length of each client info
 * string, messages per user per hour, and messages a list returns.
 */
export const FEEDBACK_MESSAGE_LIMIT = {
  TextMax: 2000,
  ScreenshotMaxBytes: 2 * 1024 * 1024,
  ScreenshotsMax: 3,
  ScreenshotAttachWindowMs: 10 * 60 * 1000,
  ScreenshotBytesPerDayMax: 20 * 1024 * 1024,
  DemoScreenshotBytesPerDayMax: 6 * 1024 * 1024,
  ScreenshotBytesWindowMs: 24 * 60 * 60 * 1000,
  ClientInfoMax: 300,
  PerHourMax: 10,
  ListMax: 100,
} as const;
