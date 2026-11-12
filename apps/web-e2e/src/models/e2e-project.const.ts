/** Names of the Playwright projects in `playwright.config.mts`. */
export const E2E_PROJECT = {
  Desktop: 'desktop',
  Phone: 'phone',
  /** iPad portrait (820 x 1180, touch): the mobile shell below 64em with room for 2-3 columns (#316). */
  Tablet: 'tablet',
} as const;
