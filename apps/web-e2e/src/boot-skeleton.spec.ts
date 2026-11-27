import { type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { demoUser, MOCK_USER, seedSession } from './support/mock-session';
import { seedWhatsNewSeen } from './support/whats-new';
import { E2E_TAG } from './models/e2e-tag.const';

// Same values as REAL_AUTH_API_STORAGE_KEY and SESSION_HINT_STORAGE_KEY in apps/web/src/app/core/auth/models.
const REAL_AUTH_API_KEY = 'sm-real-auth-api';
const SESSION_HINT_KEY = 'sm-session-hint';
// Same value as EXTENSION_BANNER_DISMISSED_STORAGE_KEY in apps/web/src/app/core/auth/models.
const EXTENSION_DISMISSED_KEY = 'sm-extension-banner-dismissed';
const SESSION_DELAY_MS = 400;
const COLD_SESSION_MS = 8000;
const BUNDLE_DELAY_MS = 600;
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
  await seedWhatsNewSeen(page);
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.addInitScript(`
    localStorage.setItem('${REAL_AUTH_API_KEY}', '1');
    ${hint ? `localStorage.setItem('${SESSION_HINT_KEY}', '1');` : ''}
    globalThis.__frames = [];
    const tick = () => {
      globalThis.__frames.push({
        skeleton: document.querySelector('[data-app-skeleton], .boot--page') !== null,
        logo: document.querySelector('.demo-start ui-logo, .demo-start ui-spinner') !== null,
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

  test('a first visit shows the landing without waiting for the session', async ({ page }) => {
    await probeFrames(page, false);
    // A cold API: the landing must not wait for it.
    await page.route('**/api/auth/get-session', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, COLD_SESSION_MS));
      await route.fulfill({ contentType: 'application/json', body: 'null' });
    });
    const start = Date.now();
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(Date.now() - start).toBeLessThan(COLD_SESSION_MS);
  });

  test('a guest on the landing gets no skeleton', async ({ page }) => {
    await probeFrames(page, false);
    await slowSession(page, null);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The attribute is never removed, so it also proves the skeleton was never shown.
    await expect(page.locator('html[data-boot-skeleton]')).toHaveCount(0);
  });
});

// The skeleton is an overlay above the app: when the app takes over, the title, the first card and
// the banner must be where the skeleton had them (#440). Same box (x, y, height) within a pixel.
interface Box {
  x: number;
  y: number;
  height: number;
}
interface Geometry {
  banner: Box | null;
  title: Box | null;
  card: Box | null;
  /** The library's extension banner (#490): desktop Chromium, not closed. */
  extension: Box | null;
}

/** Remembers the geometry of the skeleton on every frame it is in the DOM (the last one wins). */
async function recordSkeletonGeometry(page: Page): Promise<void> {
  await page.addInitScript(`
    const box = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, height: r.height };
    };
    const visible = (element) => (element && element.getClientRects().length > 0 ? element : null);
    const frame = () => {
      const root = document.querySelector('[data-app-skeleton], .boot--page');
      if (root && getComputedStyle(root).display !== 'none') {
        globalThis.__skeleton = {
          banner: box(visible(root.querySelector('.boot__banner'))),
          title: box(visible(root.querySelector('.boot__title'))),
          card: box(visible(root.querySelector('.boot__card'))),
          extension: box(visible(root.querySelector('.boot__extension'))),
        };
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  `);
}

async function readGeometry(page: Page): Promise<{ skeleton: Geometry; app: Geometry }> {
  const skeleton = await page.evaluate<Geometry | undefined>(`globalThis.__skeleton`);
  const app = await page.evaluate<Geometry>(`(() => {
    const box = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, height: r.height };
    };
    return {
      banner: box(document.querySelector('app-demo-banner ui-notice')),
      title: box(document.querySelector('app-shell h1')),
      card: box(document.querySelector('app-shell ui-card')),
      extension: box(document.querySelector('app-extension-banner section')),
    };
  })()`);
  expect(skeleton, 'the skeleton was drawn').toBeDefined();
  return { skeleton: skeleton as Geometry, app };
}

/** Same place within a pixel; `size` also compares the height (the banner: placeholders of the title and the card only stand in for their size). */
function expectSameBox(actual: Box | null, expected: Box | null, what: string, size = false): void {
  expect(actual, `${what} (skeleton)`).not.toBeNull();
  expect(expected, `${what} (app)`).not.toBeNull();
  expect(Math.abs((actual?.x ?? 0) - (expected?.x ?? 0)), `${what} x`).toBeLessThanOrEqual(1);
  expect(Math.abs((actual?.y ?? 0) - (expected?.y ?? 0)), `${what} y`).toBeLessThanOrEqual(1);
  if (size) {
    expect(
      Math.abs((actual?.height ?? 0) - (expected?.height ?? 0)),
      `${what} height`,
    ).toBeLessThanOrEqual(1);
  }
}

/** The extension banner: in both or in neither, and then in the same place with the same height. */
function expectSameExtension(skeleton: Box | null, app: Box | null): void {
  expect(skeleton === null, 'extension banner in the skeleton and in the app').toBe(app === null);
  if (skeleton && app) expectSameBox(skeleton, app, 'extension banner', true);
}

test.describe('the skeleton keeps the page still when the app takes over (#440, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock library');

  /** Delays the app bundle, so the skeleton is on screen for a while before the app starts. */
  async function slowBundle(page: Page): Promise<void> {
    await page.route(/\/main[^/]*\.js$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, BUNDLE_DELAY_MS));
      await route.continue();
    });
  }

  test(
    'a demo start: the banner, the title and the first card stay where the skeleton drew them',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedWhatsNewSeen(page);
      await recordSkeletonGeometry(page);
      await slowBundle(page);
      await page.goto('/demo');
      await expect(page.locator('app-shell ui-card').first()).toBeVisible();
      await expect(page.locator('[data-app-skeleton]')).toHaveCount(0);

      const { skeleton, app } = await readGeometry(page);
      expectSameBox(skeleton.banner, app.banner, 'banner', true);
      expectSameBox(skeleton.title, app.title, 'title');
      expectSameBox(skeleton.card, app.card, 'first card');
      expectSameExtension(skeleton.extension, app.extension);
    },
  );

  test(
    'a returning demo session: the same, from the stored demo hint',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedSession(page, demoUser(24));
      await page.addInitScript(`localStorage.setItem('${SESSION_HINT_KEY}', 'demo');`);
      await recordSkeletonGeometry(page);
      await slowBundle(page);
      await page.goto('/links');
      await expect(page.locator('app-shell ui-card').first()).toBeVisible();
      await expect(page.locator('[data-app-skeleton]')).toHaveCount(0);

      const { skeleton, app } = await readGeometry(page);
      expect(skeleton.banner, 'the stored demo hint draws the banner').not.toBeNull();
      expectSameBox(skeleton.banner, app.banner, 'banner', true);
      expectSameBox(skeleton.title, app.title, 'title');
      expectSameBox(skeleton.card, app.card, 'first card');
      expectSameExtension(skeleton.extension, app.extension);
    },
  );

  test(
    'an own session start has no banner in the skeleton',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await seedSession(page);
      await page.addInitScript(`localStorage.setItem('${SESSION_HINT_KEY}', '1');`);
      await recordSkeletonGeometry(page);
      await slowBundle(page);
      await page.goto('/links');
      await expect(page.locator('app-shell ui-card').first()).toBeVisible();

      const { skeleton, app } = await readGeometry(page);
      expect(skeleton.banner).toBeNull();
      expect(app.banner).toBeNull();
      expectSameBox(skeleton.title, app.title, 'title');
      expectSameBox(skeleton.card, app.card, 'first card');
      expectSameExtension(skeleton.extension, app.extension);
    },
  );

  // Desktop Chromium (#490): the library's extension banner has one fixed height, so the skeleton
  // holds its place at every desktop width.
  for (const width of [1280, 1600]) {
    test(`the extension banner keeps its place at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await seedSession(page);
      await page.addInitScript(`localStorage.setItem('${SESSION_HINT_KEY}', '1');`);
      await recordSkeletonGeometry(page);
      await slowBundle(page);
      await page.goto('/links');
      await expect(page.locator('app-extension-banner section')).toBeVisible();
      await expect(page.locator('app-shell ui-card').first()).toBeVisible();

      const { skeleton, app } = await readGeometry(page);
      expect(skeleton.extension, 'the skeleton draws the extension banner').not.toBeNull();
      expectSameExtension(skeleton.extension, app.extension);
      expectSameBox(skeleton.card, app.card, 'first card');
    });
  }

  test('a closed extension banner is not drawn', async ({ page }) => {
    await seedSession(page);
    await page.addInitScript(`
      localStorage.setItem('${SESSION_HINT_KEY}', '1');
      localStorage.setItem('${EXTENSION_DISMISSED_KEY}', '1');
    `);
    await recordSkeletonGeometry(page);
    await slowBundle(page);
    await page.goto('/links');
    await expect(page.locator('app-shell ui-card').first()).toBeVisible();

    const { skeleton, app } = await readGeometry(page);
    expect(skeleton.extension).toBeNull();
    expect(app.extension).toBeNull();
    await expect(page.locator('html[data-boot-extension]')).toHaveCount(0);
    expectSameBox(skeleton.card, app.card, 'first card');
  });
});

test.describe('the sidebar skeleton matches the sidebar (desktop, mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock library');

  test('the Add link button and the five fixed rows stand where the app draws them', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedSession(page);
    await page.addInitScript(`localStorage.setItem('${SESSION_HINT_KEY}', '1');`);
    await page.addInitScript(`
      const rect = (element) => {
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, height: r.height };
      };
      const frame = () => {
        const root = document.querySelector('[data-app-skeleton]');
        if (root && getComputedStyle(root).display !== 'none') {
          const rows = [...root.querySelectorAll('.boot__nav > .boot__nav-row')].map(rect);
          const titles = [...root.querySelectorAll('.boot__group-title')].map(rect);
          globalThis.__sidebar = { add: rect(root.querySelector('.boot__add-link')), rows, titles };
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    `);
    await page.route(/\/main[^/]*\.js$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, BUNDLE_DELAY_MS));
      await route.continue();
    });
    await page.goto('/links');
    await expect(page.locator('app-sidebar .ui-tree__item').first()).toBeVisible();
    await expect(page.locator('app-shell ui-card').first()).toBeVisible();

    const skeleton = await page.evaluate<{
      add: Box;
      rows: Box[];
      titles: Box[];
    }>(`globalThis.__sidebar`);
    const app = await page.evaluate<{ add: Box; rows: Box[] }>(`({
      add: (() => { const r = document.querySelector('.shell__add button').getBoundingClientRect(); return { x: r.x, y: r.y, height: r.height }; })(),
      rows: [...document.querySelectorAll('app-sidebar nav > .sidebar__scroll > ui-tree .ui-tree__row')].slice(0, 5).map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, height: r.height }; }),
    })`);
    expectSameBox(skeleton.add, app.add, 'Add link', true);
    expect(skeleton.rows.length).toBe(5);
    for (const [index, row] of app.rows.entries()) {
      expectSameBox(skeleton.rows[index] ?? null, row, `fixed row ${index + 1}`, true);
    }
  });
});
