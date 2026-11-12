/**
 * Images for the card, row and favicon stories. Data URIs: the production CSP
 * (`img-src 'self' data:`) allows them, external hosts are blocked. `Broken` is undecodable,
 * so it fails like a blocked host but raises no CSP violation in the test run.
 */
export const CARD_STORY_IMAGE = {
  Preview:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%23c9d8c6'/%3E%3Ccircle cx='128' cy='18' r='34' fill='%23e5eee2'/%3E%3Cpath d='M0 90 50 40l30 30 25-20 55 40z' fill='%23809c7c'/%3E%3C/svg%3E",
  Favicon:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23d4352c'/%3E%3Cpath d='M6 4.5v7l6-3.5z' fill='%23fff'/%3E%3C/svg%3E",
  Broken: 'data:image/png;base64,AAAA',
} as const;
