import { expect, test } from './support/test';
import { E2E_PROJECT } from './models/e2e-project.const';
import { HOW_IT_WORKS_CHAPTERS } from './models/how-it-works-chapters.const';
import { expectNoBlockingViolations } from './support/axe';
import { openAccountMenu, seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { isCompact, isPhone, tabBar } from './support/sidebar';
import { E2E_TAG } from './models/e2e-tag.const';

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

  test(
    'a signed-in person reaches About from the account menu and goes back to the shelf',
    { tag: E2E_TAG.Phone },
    async ({ page }, testInfo) => {
      await seedSession(page);
      await page.goto('/links');
      if (isCompact(page)) {
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
    },
  );

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
    if (isCompact(page)) {
      await tabBar(page).getByRole('link', { name: 'You' }).click();
      await page.getByRole('button', { name: 'How it works' }).click();
    } else {
      await openAccountMenu(page);
      await page.getByRole('menuitem', { name: 'How it works' }).click();
    }

    const dialog = page.getByRole('dialog', { name: 'Shelfmark in 3 minutes' });
    await expect(dialog).toBeVisible();
    // Each recording has its own chapter times (#330); a tablet plays the desktop one (#316).
    const times = isPhone(page) ? 'phone' : 'desktop';
    const seconds = (clock: string): number => {
      const [minutes = 0, rest = 0] = clock.split(':').map(Number);
      return minutes * 60 + rest;
    };
    await expect(dialog.getByRole('list', { name: 'Chapters' }).getByRole('listitem')).toHaveText(
      HOW_IT_WORKS_CHAPTERS.map((chapter) => new RegExp(`${chapter.title}\\s*${chapter[times]}`)),
    );
    const last = HOW_IT_WORKS_CHAPTERS[HOW_IT_WORKS_CHAPTERS.length - 1];
    const lastStart = seconds(last?.[times] ?? '0:00');

    // The recording of the layout, served from our own origin. The two recordings (#315) are named
    // like the projects: `how-it-works-<desktop|phone>`.
    // The phone recording below 40em; a tablet plays the desktop one (#316).
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
      src: expect.stringMatching(new RegExp(`^/media/how-it-works-${device}\\.(mp4|webm)$`)),
      origin: new URL(page.url()).origin,
      error: null,
      muted: true,
    });
    // The recording runs past the start of its last chapter (Share and export).
    expect(state.duration).toBeGreaterThan(lastStart);

    // English captions, on by default, with cues loaded.
    await expect(video.locator('track')).toHaveAttribute(
      'src',
      `/media/how-it-works-${device}.vtt`,
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
    const organise = seconds(HOW_IT_WORKS_CHAPTERS[1]?.[times] ?? '0:00');
    expect(time).toBeGreaterThanOrEqual(organise);
    expect(time).toBeLessThan(organise + 5);
    // The last chapter jumps into the share scene of the same recording.
    const share = dialog.getByRole('button', { name: /Share and export/ });
    await share.click();
    await expect(share).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate<number>(`${DIALOG_VIDEO}.currentTime`)).toBeGreaterThanOrEqual(
      lastStart,
    );

    await settled(page);
    await expectNoBlockingViolations(page, testInfo, { include: '[role="dialog"]' });
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('the sidebar card keeps a section gap under Tags and sits right above the footer (#315, #335)', async ({
    page,
  }) => {
    test.skip(isCompact(page), 'the card lives in the desktop sidebar');
    await seedSession(page);
    await page.goto('/links');
    const card = page.getByRole('region', { name: 'How it works' });
    await expect(card).toBeVisible();
    await expect(page.locator('app-sidebar-tags ui-chip').first()).toBeVisible();

    const tags = await page.locator('app-sidebar-tags').boundingBox();
    const box = await card.boundingBox();
    const footer = await page.locator('.sidebar__footer').boundingBox();
    expect(tags && box && footer).toBeTruthy();
    const tagsBottom = (tags?.y ?? 0) + (tags?.height ?? 0);
    // 24px (space-6) under the last row of tags; the card is the last block of the scrolling
    // middle, 12px above the footer divider (not under Tags with empty space below).
    expect(Math.round((box?.y ?? 0) - tagsBottom)).toBeGreaterThanOrEqual(24);
    const gap = (footer?.y ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0));
    expect(gap).toBeGreaterThanOrEqual(12);
    expect(gap).toBeLessThanOrEqual(16);
  });
});
