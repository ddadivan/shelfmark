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
  /** 2:3, a portrait shot (a jacket, a poster). */
  Portrait:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 180'%3E%3Crect width='120' height='180' fill='%23d6d6da'/%3E%3Ccircle cx='90' cy='36' r='24' fill='%23ececee'/%3E%3Cpath d='M0 180 40 90l30 40 20-20 30 70z' fill='%239a9aa2'/%3E%3C/svg%3E",
  /** 1:1. */
  Square:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23dfe6d3'/%3E%3Ccircle cx='90' cy='30' r='22' fill='%23f0f4e8'/%3E%3Cpath d='M0 120 40 60l30 30 20-14 30 44z' fill='%23919f7a'/%3E%3C/svg%3E",
  /** 21:9, a wide banner. */
  Wide: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 210 90'%3E%3Crect width='210' height='90' fill='%23d8dde6'/%3E%3Ccircle cx='170' cy='20' r='20' fill='%23eef1f6'/%3E%3Cpath d='M0 90 60 30l40 40 30-22 80 42z' fill='%238b97ab'/%3E%3C/svg%3E",
  Broken: 'data:image/png;base64,AAAA',
} as const;
