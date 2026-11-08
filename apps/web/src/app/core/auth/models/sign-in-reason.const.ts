/** Values of `/sign-in?reason=` that explain why the user was sent here (PROJECT.md 5.1). */
export const SIGN_IN_REASON = {
  SessionExpired: 'session-expired',
  DemoExpired: 'demo-expired',
  DemoLimit: 'demo-limit',
  DemoUnavailable: 'demo-unavailable',
  DemoFailed: 'demo-failed',
} as const;
