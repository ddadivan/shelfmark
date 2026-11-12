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
  /** The folder of the mockup library that gets a public link. */
  Folder: 'Recipes',
  /** The public page names the owner by the first name. */
  OwnerFirstName: 'Sam',
  User: {
    id: 'promo-account',
    name: 'Sam Rivera',
    email: 'sam@example.com',
    image: null,
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: '2026-10-01T00:00:00.000Z',
  },
} as const;
