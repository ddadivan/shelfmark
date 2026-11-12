import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { devices, expect, test } from '@playwright/test';
import { LANDING_HEADLINE } from '../src/models/landing-headline.const';
import { PROMO_CHAPTER_START_MS } from './models/promo-chapter.const';
import type { PromoChapter } from './models/promo-chapter.type';
import { PROMO_DEVICE } from './models/promo-device.const';
import { PROMO_MEDIA } from './models/promo-media.const';
import { PROMO_VARIANTS } from './models/promo-variants.const';
import { assertFfmpeg, encodePoster, encodeVideo } from './support/ffmpeg';
import { PromoDirector } from './support/promo-director';
import { runPromoSteps } from './support/run-promo-steps';
import { toWebVtt } from './support/webvtt';

/** A Mac user agent, so the app shows ⌘ (not Ctrl) and answers ⌘K. */
const MAC_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
/** Chapter starts further off than this are reported, so the app's chapter times get updated. */
const CHAPTER_TOLERANCE_MS = 500;
/** Lets the landing's first animation settle before the kept part of the video starts. */
const LANDING_SETTLE_MS = 600;
const ACTION_TIMEOUT_MS = 15_000;

/**
 * Records the "How it works" promo video on the mock demo (#271): every variant of
 * PROMO_VARIANTS runs PROMO_STEPS once, then ffmpeg cuts the Playwright WebM from the first
 * frame of the landing, writes MP4 + WebM + WebP poster, and the captions become a WebVTT file
 * with the times measured in this run. Run with `npx nx run web-e2e:promo`; see README.md.
 */
for (const variant of PROMO_VARIANTS) {
  const name = `${PROMO_MEDIA.Prefix}-${variant.device}`;

  test(name, async ({ browser }, testInfo) => {
    assertFfmpeg();
    const phone = variant.device === PROMO_DEVICE.Phone;
    const size = { width: variant.width, height: variant.height };
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: size,
      screen: size,
      deviceScaleFactor: phone ? 2 : 1,
      isMobile: phone,
      hasTouch: phone,
      userAgent: phone ? devices['Pixel 7'].userAgent : MAC_CHROME_UA,
      colorScheme: variant.theme,
      reducedMotion: 'no-preference',
      locale: 'en-US',
      // "Copy link" of the share chapter (#326) writes to the clipboard.
      permissions: ['clipboard-read', 'clipboard-write'],
      recordVideo: { dir: testInfo.outputPath('raw'), size },
    });
    // A step that cannot find its target fails fast instead of recording a minute of nothing.
    context.setDefaultTimeout(ACTION_TIMEOUT_MS);
    // No API runs here: answer the monitoring config, as the e2e `test` fixture does.
    await context.route('**/api/monitoring/config', (route) =>
      route.fulfill({ json: { dsn: null, environment: 'promo', release: null } }),
    );
    const page = await context.newPage();
    const recordingStartedAt = Date.now();
    await PromoDirector.installCursor(page, phone);
    const director = new PromoDirector(page, phone);

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
    await director.pause(LANDING_SETTLE_MS);
    director.start();
    const trimStart = Date.now() - recordingStartedAt;

    const posterPng = testInfo.outputPath('poster.png');
    const { cues, chapters, duration, rawDuration, cuts } = await runPromoSteps(
      { page, phone, director },
      posterPng,
    );

    if (process.env['PROMO_MEASURE']) {
      // A measuring run only reports where each chapter would start; nothing is encoded.
      console.log(
        JSON.stringify({ variant: name, durationMs: duration, chapterStartsMs: chapters, cuts }),
      );
      await context.close();
      return;
    }
    const video = page.video();
    await context.close();
    const raw = testInfo.outputPath('raw.webm');
    // Waits until Playwright has finished writing the recording; throws if it failed.
    await video?.saveAs(raw);
    expect(
      statSync(raw, { throwIfNoEntry: false })?.size,
      'Playwright recorded the video',
    ).toBeTruthy();

    const outDir = join(workspaceRoot, PROMO_MEDIA.OutDir);
    mkdirSync(outDir, { recursive: true });
    const file = (extension: string): string => join(outDir, `${name}.${extension}`);
    encodeVideo(raw, trimStart, rawDuration, cuts, { mp4: file('mp4'), webm: file('webm') });
    encodePoster(posterPng, variant.width, variant.height, file('webp'));
    writeFileSync(file('vtt'), toWebVtt(cues));

    const report = {
      variant: name,
      durationMs: duration,
      chapterStartsMs: chapters,
      cuts,
      sizesKb: Object.fromEntries(
        ['mp4', 'webm', 'webp', 'vtt'].map((ext) => [
          ext,
          Math.round(statSync(file(ext)).size / 1024),
        ]),
      ),
    };
    await testInfo.attach('promo-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    console.log(JSON.stringify(report));
    const drift = Object.entries(chapters).filter(
      ([chapter, start]) =>
        Math.abs(start - PROMO_CHAPTER_START_MS[variant.device][chapter as PromoChapter]) >
        CHAPTER_TOLERANCE_MS,
    );
    expect(
      drift,
      'a chapter started late: shorten the steps before it or update HOW_IT_WORKS_CHAPTERS and PROMO_CHAPTER_START_MS',
    ).toEqual([]);
  });
}
