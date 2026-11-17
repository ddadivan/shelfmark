/** Why loading or saving failed; each has its own line on the error screen (`popup.error.<value>`). */
export const POPUP_ERROR = {
  Offline: 'offline',
  RateLimit: 'rateLimit',
  Limit: 'limit',
  DemoLimit: 'demoLimit',
  Server: 'server',
} as const;
