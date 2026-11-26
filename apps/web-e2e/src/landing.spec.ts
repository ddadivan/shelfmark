import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';
import { COLOR_SCHEME } from './models/color-scheme.const';
import { expectNoBlockingViolations } from './support/axe';
import { LANDING_HEADLINE } from './models/landing-headline.const';
import { gotoLandingLoaded } from './support/landing';
import { settled } from './support/settled';
import { E2E_TAG } from './models/e2e-tag.const';
import { seedSession } from './support/mock-session';

test.describe('landing', () => {
  test(
    'a guest sees the headline and the sections in order',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      // Auto-waits: the sections below the hero are deferred (on idle). Shelf 16-landing: the AI
      // block, then the extension block (on every device now), the bento, before / after, why and
      // how, the finale.
      await expect(page.getByRole('heading', { level: 2 })).toHaveText([
        'Help with sorting, when you want it',
        'Save the page you are on',
        'Save once, find in seconds',
        'The same links, before and after',
        'Why this exists',
        'How it’s built',
        'Empty your saved messages.',
      ]);
    },
  );

  test('the hero fills the first screen under the header and centres its content', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    const hero = page.locator('.landing-hero');
    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    const preview = await page.locator('app-landing-hero-preview').boundingBox();
    // 100svh minus the 64px sticky header, and the live preview (the app window scaled down) is at least 520px high.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(1080 - 64 - 1);
    expect(preview?.height ?? 0).toBeGreaterThan(520);
    expect(box?.width ?? 0).toBeGreaterThan(1300);
  });

  test('"How it works" in the header scrolls to and focuses the section', async ({ page }) => {
    // The header links are hidden on a phone by design (sign-in stays), so use a desktop width.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

    // Straight away, possibly before the deferred sections are idle-loaded.
    await page.getByRole('banner').getByRole('link', { name: 'How it works' }).click();

    const section = page.getByRole('region', { name: 'Save once, find in seconds' });
    await expect(section).toBeInViewport();
    await expect(section).toBeFocused();
  });

  test('opening the page with #how scrolls to and focuses the section', async ({ page }) => {
    await page.goto('/#how');

    const section = page.getByRole('region', { name: 'How it’s built' });
    await expect(section).toBeInViewport();
    await expect(section).toBeFocused();

    // Settled: every deferred block (the footer comes last) is in, and the target did not move.
    await expect(page.getByRole('contentinfo')).toBeAttached();
    await expect(section).toBeInViewport();
    await expect(section).toBeFocused();
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    test(`the first screen holds the headline, the actions and the app preview at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
      const preview = page.locator('app-landing-hero-preview');
      await expect(preview).toBeVisible();

      // Shelf 16-landing: the 64px header, then the hero copy above the live preview, all of it
      // inside the first window.
      const header = await page.locator('.landing-header').boundingBox();
      const copy = await page.locator('.landing-hero__copy').boundingBox();
      const box = await preview.boundingBox();
      if (!header || !copy || !box) {
        throw new Error('The header, the hero copy or the preview has no box');
      }
      expect(Math.round(header.height)).toBe(64);
      expect(copy.y).toBeGreaterThanOrEqual(header.y + header.height);
      expect(box.y).toBeLessThan(viewport.height);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      await expect(
        page.locator('app-landing-hero').getByRole('link', { name: 'Open the demo' }),
      ).toBeInViewport();
      const overflow = await page.evaluate<number>(
        '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  for (const width of [360, 800, 1280]) {
    test(`the header has its final height from the first frame at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(`
        window.__heights = [];
        const sample = () => {
          const header = document.querySelector('header');
          if (header) window.__heights.push(header.getBoundingClientRect().height);
          if (window.__heights.length < 120) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      `);

      await gotoLandingLoaded(page);

      const heights = await page.evaluate<number[]>('window.__heights');
      expect(heights.length).toBeGreaterThan(0);
      expect(new Set(heights).size, JSON.stringify(heights)).toBe(1);
    });
  }

  test('the hero headline has its text in the first frame it is rendered', async ({ page }) => {
    // Plain script (as elsewhere in this suite): the e2e project has no DOM typings.
    await page.addInitScript(`
      window.__firstHero = null;
      const sample = () => {
        const title = document.querySelector('.landing-hero__title');
        if (title) {
          window.__firstHero = (title.textContent || '').trim();
        } else {
          requestAnimationFrame(sample);
        }
      };
      requestAnimationFrame(sample);
    `);

    await gotoLandingLoaded(page);

    const firstHero = await page.evaluate<string | null>('window.__firstHero');
    expect(firstHero, 'the headline never rendered').not.toBeNull();
    expect(firstHero).toBe(LANDING_HEADLINE);
  });

  for (const width of [360, 800, 1280]) {
    test(`the app preview and the deferred sections shift nothing at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      // Plain scripts (as elsewhere in this suite): the e2e project has no DOM typings.
      await page.addInitScript(`
        window.__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            const where = (s) => s.node ? s.node.nodeName + '.' + (s.node.className || s.node.parentElement?.className || '') : '?';
            window.__shifts.push({
              at: Math.round(entry.startTime),
              value: entry.value,
              sources: entry.sources.map((s) => ({
                node: where(s),
                from: s.previousRect.y + '+' + s.previousRect.height,
                to: s.currentRect.y + '+' + s.currentRect.height,
              })),
            });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      `);

      await gotoLandingLoaded(page);
      // The preview's cards land and its toast slides in after the headline: wait for the last
      // part to finish, then for the page to settle.
      await expect(page.locator('app-landing-hero-preview .stage__toast')).toHaveCSS(
        'opacity',
        '1',
      );
      await settled(page);

      // The sources go into the failure message, so a CI failure says what moved.
      const shifts = await page.evaluate<{ at: number; value: number }[]>('window.__shifts');
      const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
      expect(total, JSON.stringify(shifts)).toBeLessThan(0.001);
    });
  }
});

// Shelf 16-landing: the header and the What's new block change with the width and the session.
test.describe('landing variants', () => {
  const header = (page: Page): Locator => page.getByRole('banner');

  for (const variant of [
    { width: 1280, links: true, signIn: true },
    { width: 700, links: false, signIn: true },
    { width: 360, links: false, signIn: false },
  ]) {
    test(`a guest at ${variant.width}px: page links ${variant.links ? 'shown' : 'hidden'}, Sign in ${variant.signIn ? 'shown' : 'hidden'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: variant.width, height: 800 });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();

      const nav = header(page).getByRole('navigation', { name: 'Page' });
      if (variant.links) {
        await expect(nav.getByRole('link')).toHaveText([
          'How it works',
          'AI',
          /^What.s new$/,
          'Help',
          'Privacy',
        ]);
      } else {
        await expect(nav).toBeHidden();
      }
      await expect(header(page).getByRole('link', { name: 'Sign in' })).toHaveCount(
        variant.signIn ? 1 : 0,
      );
      await expect(header(page).getByRole('link', { name: 'Start your shelf' })).toBeVisible();
      await expect(header(page).getByRole('link', { name: 'Back to my shelf' })).toHaveCount(0);
      // No What's new block for a guest.
      await expect(page.getByRole('region', { name: /^What.s new$/ })).toHaveCount(0);
    });
  }

  test('a guest switches the theme in the header and it is remembered on this device', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await header(page).getByRole('button', { name: 'Switch theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test(
    'a signed-in person: / opens the links, /about has Back to my shelf and What’s new',
    { tag: E2E_TAG.Mobile },
    async ({ page }) => {
      test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock auth');
      await seedSession(page);
      await page.goto('/');
      await expect(page).toHaveURL('/links');

      await page.goto('/about');
      await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
      await expect(header(page).getByRole('link', { name: 'Back to my shelf' })).toBeVisible();
      await expect(header(page).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Open the demo' })).toHaveCount(0);
      const whatsNew = page.getByRole('region', { name: /^What.s new$/ });
      await expect(whatsNew.getByRole('listitem')).toHaveCount(4);
      await expect(whatsNew.getByRole('link', { name: 'See all changes' })).toHaveAttribute(
        'href',
        '/changelog',
      );
    },
  );
});

test.describe('landing scenes and reveals', () => {
  test('the bento sits between the hero and the before and after, no overflow at 360px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await gotoLandingLoaded(page);
    const bento = page.getByRole('region', { name: 'Save once, find in seconds' });
    const before = page.getByRole('region', { name: 'The same links, before and after' });
    await bento.scrollIntoViewIfNeeded();

    const [b, a] = await Promise.all([bento.boundingBox(), before.boundingBox()]);
    expect(b?.y ?? 0).toBeLessThan(a?.y ?? 0);
    expect(b?.width ?? 999).toBeLessThanOrEqual(360);
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('the scattered notes drift on, and stand still under reduced motion', async ({ page }) => {
    await page.goto('/');
    const shelf = page.getByRole('region', { name: 'The same links, before and after' });
    await shelf.scrollIntoViewIfNeeded();
    const mess = shelf.getByRole('img', { name: /scattered across saved messages/ });
    const running = (): Promise<number> =>
      mess.evaluate(
        (el) =>
          el
            .getAnimations({ subtree: true })
            .filter((animation: { playState: string }) => animation.playState === 'running').length,
      );

    await expect(mess.getByText('Bookmarks bar (91)')).toBeVisible();
    // Five notes, each on its own endless drift.
    await expect.poll(running).toBe(5);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(running).toBe(0);
  });
});

test.describe('landing app preview motion', () => {
  const preview = (page: Page): Locator => page.locator('app-landing-hero-preview');
  const toast = (page: Page): Locator => preview(page).locator('.stage__toast');

  test('the cards land, the toast slides in, then the preview cycles through its frames', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(preview(page).locator('.stage__item').first()).toBeVisible();

    // The first frame: All links with the toast (16-landing).
    await expect(toast(page)).toHaveClass(/stage__toast--shown/, { timeout: 5000 });
    await expect(toast(page)).toHaveCSS('opacity', '1');
    await expect(toast(page)).toContainText('Saved to Watch later');
    await expect(toast(page)).toContainText('Undo');
    const title = preview(page).locator('.stage__title');
    const first = (await title.textContent())?.trim();
    // Every 3.6 s the next frame; the order and the hold after a click:
    // landing-preview-cycle.service.spec.ts.
    await expect
      .poll(async () => (await title.textContent())?.trim(), { timeout: 8000 })
      .not.toBe(first);
  });
});

/**
 * Scrolls the page top to bottom in steps, so every section is seen by its reveal observer (an
 * off-screen section stays hidden until it scrolls in; there is no timeout that reveals it).
 */
async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(`(async () => {
    const root = document.scrollingElement ?? document.documentElement;
    for (let y = 0; y < root.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    scrollTo(0, root.scrollHeight);
  })()`);
}

/** Waits for the reveal transitions to end, so axe never reads half-transparent text. */
async function settleReveals(page: Page): Promise<void> {
  await expect(page.locator('.landing-reveal--pending')).toHaveCount(0);
  await page.evaluate(
    'Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished)).then(() => undefined)',
  );
}

// Desktop only: the phone layout has the same content (the header drops two links, see
// landing-header.component.spec.ts), and the smoke and mobile overflow checks cover 360px.
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 900 }] as const;

for (const colorScheme of Object.values(COLOR_SCHEME)) {
  for (const viewport of VIEWPORTS) {
    test.describe(`landing accessibility (${colorScheme}, ${viewport.name})`, () => {
      // The static frame: a scan in the middle of a fade or the folder cycle would read
      // half-transparent text, so these run without motion and stay deterministic.
      test.use({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { width: viewport.width, height: viewport.height },
      });

      test('the first screen has no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        await gotoLandingLoaded(page);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });

    test.describe(`landing accessibility, settled scenes (${colorScheme}, ${viewport.name})`, () => {
      test.use({ colorScheme, viewport: { width: viewport.width, height: viewport.height } });

      test('shelf and board on a settled frame (reduced motion) have no serious or critical axe violations', async ({
        page,
      }, testInfo) => {
        // The loops never end, so the scan runs on the static frame they leave under reduced motion.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await gotoLandingLoaded(page);
        await scrollThrough(page);
        const shelf = page.getByRole('region', { name: 'The same links, before and after' });
        await shelf.scrollIntoViewIfNeeded();
        await settleReveals(page);
        await expect
          .poll(() => shelf.evaluate((el) => el.getAnimations({ subtree: true }).length))
          .toBe(0);
        await page.evaluate('document.fonts.ready.then(() => undefined)');

        await expectNoBlockingViolations(page, testInfo);
      });
    });
  }
}
