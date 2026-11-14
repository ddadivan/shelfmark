import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { MOCK_USER } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

// Same values as REAL_AUTH_API_STORAGE_KEY and SESSION_HINT_STORAGE_KEY in apps/web/src/app/core/auth/models.
const REAL_AUTH_API_KEY = 'sm-real-auth-api';
const SESSION_HINT_KEY = 'sm-session-hint';
const SESSION_DELAY_MS = 400;
const SESSION = {
  user: { ...MOCK_USER, onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
};
const DEMO_SESSION = {
  user: {
    ...SESSION.user,
    isDemo: true,
    demoExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  },
};

interface Frame {
  skeleton: boolean;
  logo: boolean;
  shell: boolean;
  page: boolean;
}

/** Records, on every animation frame, whether the skeleton, the shell or any page is in the DOM. */
async function probeFrames(page: Page, hint: boolean): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.addInitScript(`
    localStorage.setItem('${REAL_AUTH_API_KEY}', '1');
    ${hint ? `localStorage.setItem('${SESSION_HINT_KEY}', '1');` : ''}
    globalThis.__frames = [];
    const tick = () => {
      globalThis.__frames.push({
        skeleton: document.querySelector('[data-app-skeleton], .boot--page') !== null,
        logo: document.querySelector('app-root ui-logo, app-root ui-spinner') !== null,
        shell: document.querySelector('app-shell') !== null,
        page: document.querySelector('app-root > :not(router-outlet)') !== null,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  `);
}

async function slowSession(page: Page, session: unknown): Promise<void> {
  await page.route('**/api/auth/get-session', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SESSION_DELAY_MS));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(session) });
  });
}

function readFrames(page: Page): Promise<Frame[]> {
  return page.evaluate<Frame[]>(`globalThis.__frames`);
}

test.describe('app skeleton while a signed-in start loads (#410)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock library');
  // The service worker would answer the routed requests itself.
  test.use({ serviceWorkers: 'block' });

  test(
    'a returning session shows the skeleton, then the app, never an empty frame',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await probeFrames(page, true);
      await slowSession(page, SESSION);
      await page.goto('/');

      await expect(page.locator('app-shell')).toBeVisible();
      await expect(page.locator('[data-app-skeleton]')).toHaveCount(0);
      const frames = await readFrames(page);
      expect(frames.some((f) => f.skeleton)).toBe(true);
      expect(frames.filter((f) => !f.skeleton && !f.shell && !f.page)).toEqual([]);
      // Skeleton and shell are never the only thing missing: the skeleton ends with the shell.
      const lastSkeleton = frames.map((f) => f.skeleton).lastIndexOf(true);
      expect(frames[lastSkeleton + 1]?.shell ?? true).toBe(true);
    },
  );

  test(
    'opening the demo shows the skeleton, with no logo or spinner, until the library',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await probeFrames(page, false);
      let signedIn = false;
      await page.route('**/api/auth/get-session', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, SESSION_DELAY_MS));
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(signedIn ? DEMO_SESSION : null),
        });
      });
      await page.route('**/api/demo', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, SESSION_DELAY_MS));
        signedIn = true;
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(DEMO_SESSION),
        });
      });
      await page.goto('/demo');

      await expect(page.locator('app-shell')).toBeVisible();
      await expect(page.locator('[data-app-skeleton]')).toHaveCount(0);
      const frames = await readFrames(page);
      expect(frames.filter((f) => !f.skeleton && !f.shell && !f.page)).toEqual([]);
      // The start page is the skeleton itself: no logo or spinner in any frame.
      expect(frames.filter((f) => f.logo)).toEqual([]);
      expect(frames.filter((f) => f.page && !f.skeleton && !f.shell)).toEqual([]);
    },
  );

  test('a guest on the landing gets no skeleton', async ({ page }) => {
    await probeFrames(page, false);
    await slowSession(page, null);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The attribute is never removed, so it also proves the skeleton was never shown.
    await expect(page.locator('html[data-boot-skeleton]')).toHaveCount(0);
  });
});
