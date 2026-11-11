import { expect, test } from './support/test';
import { E2E_PROJECT } from './models/e2e-project.const';
import { expectNoBlockingViolations } from './support/axe';
import { openAccountMenu, seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isPhone, tabBar } from './support/sidebar';

/** `HTMLMediaElement.HAVE_METADATA`: duration and size are known. */
const HAVE_METADATA = 1;
/**
 * The dialog's `<video>` as a browser-side expression: the video checks read its state with
 * string scripts (this project has no DOM lib, see `support/settled.ts`).
 */
const DIALOG_VIDEO = `document.querySelector('[role="dialog"] video')`;

test.describe('About and "How it works" (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('a guest at /about sees the public landing', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByRole('link', { name: 'Open the demo' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to my shelf' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: "What's new" })).toHaveCount(0);
  });

  test('a signed-in person reaches About from the account menu and goes back to the shelf', async ({
    page,
  }, testInfo) => {
    await seedSession(page);
    await page.goto('/links');
    if (isPhone(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await page.getByRole('link', { name: 'About Shelfmark' }).click();
    } else {
      await openAccountMenu(page);
      await page.getByRole('menuitem', { name: 'About Shelfmark' }).click();
    }

    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { name: "What's new" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the demo' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
    await settled(page);
    await expectNoBlockingViolations(page, testInfo);

    await page.getByRole('link', { name: 'Back to my shelf' }).first().click();
    await expect(page).toHaveURL('/links');
  });

  test('"What\'s new" sits in the page column like the other sections, caption not cut', async ({
    page,
  }) => {
    await seedSession(page);
    await page.goto('/about');
    const caption = page.getByRole('heading', { name: "What's new" });
    await expect(caption).toBeVisible();
    await settled(page);

    const [captionBox, panelBox, heroBox, viewport] = await Promise.all([
      caption.boundingBox(),
      page.locator('.landing-whats-new__list').boundingBox(),
      page.locator('.landing-hero__copy').boundingBox(),
      page.viewportSize(),
    ]);
    if (!captionBox || !panelBox || !heroBox || !viewport) {
      throw new Error('A box is missing');
    }
    // The same left edge as the hero's copy, away from the window edge, panel inside the column.
    expect(captionBox.x).toBeGreaterThan(8);
    expect(Math.abs(captionBox.x - heroBox.x)).toBeLessThanOrEqual(1);
    expect(panelBox.x + panelBox.width).toBeLessThan(viewport.width - 8);
    await expect(caption).toHaveText("What's new");
  });

  test('"How it works" plays the promo video with captions, and chapters jump', async ({
    page,
  }, testInfo) => {
    await seedSession(page);
    await page.goto('/links');
    if (isPhone(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await page.getByRole('button', { name: 'How it works' }).click();
    } else {
      await openAccountMenu(page);
      await page.getByRole('menuitem', { name: 'How it works' }).click();
    }

    const dialog = page.getByRole('dialog', { name: 'Shelfmark in 60 seconds' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Chapters' }).getByRole('listitem')).toHaveText([
      /Save a link\s*0:00/,
      /Folders and tags\s*0:18/,
      /Find it again\s*0:41/,
    ]);

    // The recording of the device (light theme: the e2e default), served from our own origin.
    // The recordings are named like the projects: `how-it-works-<theme>-<desktop|phone>`.
    const device = isPhone(page) ? E2E_PROJECT.Phone : E2E_PROJECT.Desktop;
    const video = dialog.locator('video');
    await expect(video).toBeVisible();
    await expect
      .poll(() => page.evaluate<number>(`${DIALOG_VIDEO}.readyState`), {
        message: 'the video loads its metadata',
      })
      .toBeGreaterThanOrEqual(HAVE_METADATA);
    const state = await page.evaluate<{
      src: string;
      origin: string;
      error: number | null;
      muted: boolean;
      duration: number;
    }>(
      `((el) => ({ src: new URL(el.currentSrc).pathname, origin: new URL(el.currentSrc).origin, error: el.error?.code ?? null, muted: el.muted, duration: el.duration }))(${DIALOG_VIDEO})`,
    );
    expect(state).toMatchObject({
      src: expect.stringMatching(new RegExp(`^/media/how-it-works-light-${device}\\.(mp4|webm)$`)),
      origin: new URL(page.url()).origin,
      error: null,
      muted: true,
    });
    expect(state.duration).toBeGreaterThan(41);

    // English captions, on by default, with cues loaded.
    await expect(video.locator('track')).toHaveAttribute(
      'src',
      `/media/how-it-works-light-${device}.vtt`,
    );
    await expect
      .poll(() =>
        page.evaluate(
          `((track) => ({ kind: track?.kind, mode: track?.mode, cues: (track?.cues?.length ?? 0) > 0 }))(${DIALOG_VIDEO}.textTracks[0])`,
        ),
      )
      .toEqual({ kind: 'captions', mode: 'showing', cues: true });

    // A chapter jumps to its start and shows as the current one.
    const chapter = dialog.getByRole('button', { name: /Folders and tags/ });
    await chapter.click();
    await expect(chapter).toHaveAttribute('aria-pressed', 'true');
    const time = await page.evaluate<number>(`${DIALOG_VIDEO}.currentTime`);
    expect(time).toBeGreaterThanOrEqual(18);
    expect(time).toBeLessThan(41);

    await settled(page);
    await expectNoBlockingViolations(page, testInfo, { include: '[role="dialog"]' });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('the sidebar card shows for a new account until it is hidden', async ({ page }) => {
    test.skip(isPhone(page), 'the card lives in the desktop sidebar');
    await seedSession(page);
    await page.goto('/links');
    const card = page.getByRole('region', { name: 'How it works' });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Hide' }).click();
    await expect(card).toHaveCount(0);

    await page.reload();
    await expect(page.locator('ui-card').first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'How it works' })).toHaveCount(0);
  });

  test('opening the video from the card also retires the card', async ({ page }) => {
    test.skip(isPhone(page), 'the card lives in the desktop sidebar');
    await seedSession(page);
    await page.goto('/links');
    const card = page.getByRole('region', { name: 'How it works' });

    await card.getByRole('button', { name: 'New here? Watch how it works' }).click();
    await expect(page.getByRole('dialog', { name: 'Shelfmark in 60 seconds' })).toBeVisible();
    await expect(card).toHaveCount(0);
  });
});
