/**
 * The "Share a collection" chapter (#326). Demo accounts cannot share, so the chapter switches to
 * a made-up regular mock account (no personal data) under the mock `showcase` scenario, which
 * starts every mock session, the guest's too, from the demo's mockup library. The keys mirror
 * MOCK_SESSION_STORAGE_KEY and MOCK_LINKS_SCENARIO_KEY / MOCK_LINKS_SCENARIO.Showcase in apps/web
 * (e2e code must not import app code).
 */
export const PROMO_SHARE = {
  SessionKey: 'sm-mock-session',
  ScenarioKey: 'sm-mock-links-scenario',
  Scenario: 'showcase',
  /** MOCK_RATING_STORAGE_KEY of the rating mock: the account's age decides when it asks. */
  RatingKey: 'sm-mock-feedback',
  RatingAgeDays: 9,
  /** What the share dialog shows under the scenario (MOCK_PUBLIC_ORIGIN in apps/web). */
  PublicOrigin: 'https://shelfmark-app.vercel.app',
  /** The folder of the mockup library that gets a public link. */
  Folder: 'Recipes',
  /** The public page names the owner by the first name. */
  OwnerFirstName: 'Sam',
  User: {
    id: 'promo-account',
    name: 'Sam Rivera',
    email: 'sam@example.com',
    /** An illustrated stand-in for the photo a provider sends (a drawn face, no real person). */
    image:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZjRjMzhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZTA4MDVlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSJ1cmwoI2IpIi8+PGNpcmNsZSBjeD0iNDgiIGN5PSIzOCIgcj0iMTciIGZpbGw9IiNmYmU3ZDMiLz48cGF0aCBkPSJNMTQgOTZjMy0yMSAxNy0zMiAzNC0zMnMzMSAxMSAzNCAzMnoiIGZpbGw9IiMyZjVkNjIiLz48cGF0aCBkPSJNMzAgMzRjMC0xMyA4LTIxIDE4LTIxczE5IDcgMTkgMjBjLTUtNi0xMi04LTE5LThzLTEzIDMtMTggOXoiIGZpbGw9IiM1YTNiMmUiLz48L3N2Zz4=',
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: '2026-10-01T00:00:00.000Z',
  },
} as const;
