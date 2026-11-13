/**
 * Playwright tags that pick the tests the touch projects run (ADR 0043). `desktop` runs every
 * test; `tablet` runs only `@mobile` and `@tablet`; `phone` runs only `@mobile` and `@phone`.
 * A test that sets its own viewport is never tagged: it would only repeat the desktop run.
 */
export const E2E_TAG = {
  /** The shell below 64em or touch, where the iPad layout matters too: tablet and phone. */
  Mobile: '@mobile',
  /** Paths that exist only on a phone, or core journeys whose UI differs in the shell. */
  Phone: '@phone',
  /** Tablet-only checks (none yet). */
  Tablet: '@tablet',
} as const;
