import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { settled } from '../src/support/settled';
import { test } from '../src/support/test';
import { HELP_MEDIA } from './models/help-media.const';
import { HELP_SHOTS } from './models/help-shots.const';
import { closeToasts, hideBanners } from './support/clear-noise';
import { encodeWebp } from './support/encode-webp';

// Captures the screenshots of the help articles from the mock data, in the light and the dark
// theme, as WebP into `apps/web/public/media/help/`. Run: `npm run help-media` (README.md).

const OUT = join(workspaceRoot, HELP_MEDIA.outDir);
const THEMES = ['light', 'dark'] as const;

test.describe.configure({ mode: 'serial' });

for (const colorScheme of THEMES) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({
      colorScheme,
      viewport: HELP_MEDIA.viewport,
      deviceScaleFactor: HELP_MEDIA.scale,
      // The service worker would answer the cover requests before `page.route` sees them.
      serviceWorkers: 'block',
    });

    for (const shot of HELP_SHOTS) {
      test(`${shot.slug}`, async ({ page }) => {
        mkdirSync(OUT, { recursive: true });
        await hideBanners(page);
        await shot.prepare(page);
        await closeToasts(page);
        await page.mouse.move(0, 0);
        await settled(page);
        const png = await page.screenshot({ animations: 'disabled', caret: 'hide' });
        const webp = join(OUT, `${shot.slug}-${colorScheme}.webp`);
        const { bytes, quality } = await encodeWebp(png, webp);
        console.log(
          `${webp}: ${(bytes / 1000).toFixed(0)} kB (quality ${quality}), ${shot.article}`,
        );
      });
    }
  });
}
