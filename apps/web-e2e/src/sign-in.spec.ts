import { expect, test } from './support/test';
import { isCompact, tabBar } from './support/sidebar';
import { dismissOnboarding, MOCK_USER, seedSession, signOutFromUi } from './support/mock-session';
import { E2E_TAG } from './models/e2e-tag.const';

const GITHUB_BUTTON = 'Continue with GitHub';

test.describe('sign-in flow (mock auth)', () => {
  test(
    'a guest on a protected URL lands on sign-in and returns after signing in',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await page.goto('/links');

      await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
      await expect(
        page.getByRole('heading', { level: 1, name: 'All your links on one shelf' }),
      ).toBeVisible();

      await page.getByRole('button', { name: GITHUB_BUTTON }).click();

      await dismissOnboarding(page);
      await expect(page).toHaveURL(/\/links$/);
      await expect(page.getByRole('heading', { level: 1, name: 'All links' })).toBeVisible();
    },
  );

  test('sign-out clears the session and returns to sign-in', async ({ page }) => {
    await seedSession(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/links$/);
    if (isCompact(page)) {
      // The account is on the You tab, where the name is printed.
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await expect(page.getByText(MOCK_USER.name)).toHaveCount(1);
    } else {
      // The top bar shows the avatar only, not the name.
      await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    }

    await signOutFromUi(page);
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto('/links');
    await expect(page).toHaveURL(/\/sign-in\?returnUrl=%2Flinks$/);
  });

  test('a signed-in user is kept away from sign-in', async ({ page }) => {
    await seedSession(page);
    await page.goto('/sign-in');

    await expect(page).toHaveURL(/\/links$/);
  });

  test('the sign-in page fits a 360px phone and shows the expiry reason', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/sign-in?reason=session-expired');

    await expect(page.getByText('Your session has expired. Sign in again.')).toBeVisible();
    const overflow = await page.evaluate<number>(
      '(document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth',
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('on a desktop the glass card is centred and fourteen cards drift in the side lanes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const card = await page.locator('.sign-in__panel').boundingBox();
    if (!card) {
      throw new Error('the sign-in card has no box');
    }
    expect(Math.abs(card.x + card.width / 2 - 1440 / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(card.y + card.height / 2 - 900 / 2)).toBeLessThanOrEqual(2);
    // The mosaic band is a phone layout.
    await expect(page.locator('.sign-in__art')).toHaveCount(0);

    // Fourteen cards (#315) in three depth layers, each floating and taking its turn to land (ring).
    await expect(page.locator('.sd-card')).toHaveCount(14);
    for (const layer of ['far', 'mid', 'near']) {
      expect(await page.locator(`.sd-card--${layer}`).count()).toBeGreaterThan(0);
    }
    // String scripts: this project has no DOM lib, and the code runs in the browser anyway.
    const running = await page.evaluate<string[]>(
      "document.getAnimations().filter((a) => a instanceof CSSAnimation && a.playState === 'running').map((a) => a.animationName).filter((name) => name.endsWith('sd-float') || name.endsWith('sd-ring'))",
    );
    expect(running.filter((n) => n.endsWith('sd-float'))).toHaveLength(14);
    expect(running.filter((n) => n.endsWith('sd-ring'))).toHaveLength(14);
    // Every card looks like the library's: the drawing, favicon and domain, the date, tag chips.
    await expect(page.locator('.sd-card ui-card .ui-card__placeholder')).toHaveCount(14);
    await expect(page.locator('.sd-card .ui-card__date').first()).not.toBeEmpty();
    expect(await page.locator('.sd-card ui-chip').count()).toBeGreaterThanOrEqual(14);
    // Far is dimmer and smaller than near.
    const far = page.locator('.sd-card--far .sd-fly').first();
    const near = page.locator('.sd-card--near .sd-fly').first();
    // The layer's opacity once the fly-in is over (while it flies, every card fades in from 0).
    await expect
      .poll(() =>
        page.evaluate<number>(
          "document.getAnimations().filter((a) => a instanceof CSSAnimation && a.animationName.endsWith('sd-fly') && a.playState === 'running').length",
        ),
      )
      .toBe(0);
    await expect(far).toHaveCSS('opacity', '0.6');
    await expect(near).toHaveCSS('opacity', '1');
    const [farBox, nearBox] = await Promise.all([
      far.locator('.sd-tilt').boundingBox(),
      near.locator('.sd-tilt').boundingBox(),
    ]);
    expect(farBox?.width ?? 0).toBeLessThan(nearBox?.width ?? 0);
  });

  test('the cards fly in on every visit while the sign-in card is there at once', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const visit of [1, 2]) {
      await page.goto('/sign-in');
      const panel = page.locator('.sign-in__panel');
      await expect(panel, `visit ${visit}`).toBeVisible();

      // The card is fully opaque and nothing animates it, while the cards are still on their way.
      await expect(panel).toHaveCSS('opacity', '1');
      expect(
        await page.evaluate<number>(
          "document.querySelector('.sign-in__panel').getAnimations({ subtree: true }).length",
        ),
      ).toBe(0);
      const flying = await page.evaluate<number>(
        "document.getAnimations().filter((a) => a instanceof CSSAnimation && a.animationName.endsWith('sd-fly') && a.playState === 'running').length",
      );
      expect(flying, `visit ${visit}`).toBe(14);
      // ... and they settle: the wave ends.
      await expect
        .poll(() =>
          page.evaluate<number>(
            "document.getAnimations().filter((a) => a instanceof CSSAnimation && a.animationName.endsWith('sd-fly') && a.playState === 'running').length",
          ),
        )
        .toBe(0);
    }
  });

  test('with reduced motion the cards rest in their lanes: no fly-in, no drift, no ring', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await expect(page.locator('.sd-card')).toHaveCount(14);
    await expect(page.locator('.sd-card .sd-fly').first()).toHaveCSS('opacity', /^(1|0\.\d+)$/);

    const animations = await page.evaluate<number>(
      'document.getAnimations().filter((a) => a instanceof CSSAnimation).length',
    );
    expect(animations).toBe(0);
  });

  for (const viewport of [
    { width: 1024, height: 768, cards: 8 },
    { width: 1280, height: 720, cards: 14 },
    { width: 1366, height: 768, cards: 14 },
    { width: 1440, height: 900, cards: 14 },
    { width: 1920, height: 1080, cards: 14 },
    { width: 2560, height: 1440, cards: 22 },
    { width: 3840, height: 2160, cards: 22 },
  ]) {
    test(`at ${viewport.width}x${viewport.height} ${viewport.cards} cards sit in the side lanes: no collisions, none under the sign-in card`, async ({
      page,
    }) => {
      // At rest (reduced motion): the boxes are the resting places.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/sign-in');
      await expect(page.locator('.sd-card')).toHaveCount(viewport.cards);
      await page.evaluate('document.fonts.ready.then(() => undefined)');

      const panel = await page.locator('.sign-in__panel').boundingBox();
      if (!panel) {
        throw new Error('the sign-in card has no box');
      }
      const boxes = await page.locator('.sd-tilt').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          const far = el.closest('.sd-card')?.classList.contains('sd-card--far') ?? false;
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, far };
        }),
      );
      expect(boxes).toHaveLength(viewport.cards);
      const area = (r: { left: number; right: number; top: number; bottom: number }) =>
        Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
      const shared = (
        a: { left: number; right: number; top: number; bottom: number },
        b: { left: number; right: number; top: number; bottom: number },
      ) =>
        area({
          left: Math.max(a.left, b.left),
          right: Math.min(a.right, b.right),
          top: Math.max(a.top, b.top),
          bottom: Math.min(a.bottom, b.bottom),
        });
      const screen = { left: 0, top: 0, right: viewport.width, bottom: viewport.height };
      for (const [i, a] of boxes.entries()) {
        const where = `card ${i} ${JSON.stringify(a)}`;
        // Never under the sign-in card. A card may hang over the window edge (the scattered
        // layout, #314), but most of it stays on screen.
        expect(a.right <= panel.x || a.left >= panel.x + panel.width, where).toBe(true);
        expect(shared(a, screen) / area(a), where).toBeGreaterThanOrEqual(0.6);
        for (const [j, b] of boxes.entries()) {
          if (j > i) {
            const overlap = shared(a, b);
            if (a.far !== b.far) {
              // A small far card may tuck slightly behind a nearer one (it reads as behind it).
              const far = a.far ? a : b;
              expect(overlap / area(far), `far card ${i}/${j} tucks too far`).toBeLessThanOrEqual(
                0.25,
              );
            } else {
              expect(overlap, `cards ${i} and ${j} overlap`).toBe(0);
            }
          }
        }
      }
    });
  }

  test('with a mouse the cards lean toward the pointer while they keep drifting', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'the phone project is touch: no hover, no tilt');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    const tilt = page.locator('.sd-tilt').first();
    await expect(tilt).toBeVisible();

    await page.mouse.move(1400, 880);
    await expect.poll(() => tilt.evaluate((el) => el.style.getPropertyValue('--tx'))).not.toBe('');
    const tx = Number(await tilt.evaluate((el) => el.style.getPropertyValue('--tx')));
    expect(tx).toBeGreaterThan(0.5);
    const running = await page.evaluate<number>(
      "document.getAnimations().filter((a) => a instanceof CSSAnimation && a.animationName.endsWith('sd-float')).length",
    );
    expect(running).toBe(14);
  });

  test('with reduced motion the cards do not lean', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await expect(page.locator('.sd-tilt')).toHaveCount(14);

    await page.mouse.move(1400, 880);
    // The lean is applied on the next animation frame after a pointer move: wait two frames.
    await page.evaluate(
      'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    );
    const tx = await page
      .locator('.sd-tilt')
      .first()
      .evaluate((el) => el.style.getPropertyValue('--tx'));
    expect(tx).toBe('');
  });

  test('on a phone the mosaic sits above the form', { tag: E2E_TAG.Phone }, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const art = await page.locator('.sign-in__art').boundingBox();
    const panel = await page.locator('.sign-in__panel').boundingBox();
    expect(art).not.toBeNull();
    expect((art?.y ?? 0) + (art?.height ?? 0)).toBeLessThanOrEqual((panel?.y ?? 0) + 1);
    await expect(page.locator('.sd-card')).toHaveCount(0);
  });
});
