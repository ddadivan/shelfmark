import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { settled } from '../src/support/settled';
import { test } from '../src/support/test';
import { WHATS_NEW_MEDIA } from './models/whats-new-media.const';
import { WHATS_NEW_SHOTS } from './models/whats-new-shots.const';
import { encodeWebp } from './support/encode-webp';

// Captures every New item of the release (`WHATS_NEW_MEDIA.version`) from the mock data, in the
// light and the dark theme, and writes compressed WebP files to `apps/web/public/media/whats-new/<version>/`.
// Run: `npm run whats-new-media` (apps/web/CLAUDE.md). Re-run it whenever the screens change.

const OUT = join(workspaceRoot, 'apps/web/public/media/whats-new', WHATS_NEW_MEDIA.version);
const THEMES = ['light', 'dark'] as const;

test.describe.configure({ mode: 'serial' });

for (const colorScheme of THEMES) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({
      colorScheme,
      viewport: WHATS_NEW_MEDIA.viewport,
      deviceScaleFactor: WHATS_NEW_MEDIA.scale,
      // The service worker would answer the cover requests before `page.route` sees them.
      serviceWorkers: 'block',
    });

    for (const shot of WHATS_NEW_SHOTS) {
      test(`${shot.slug}`, async ({ page }) => {
        mkdirSync(OUT, { recursive: true });
        const clip = await shot.prepare(page);
        await page.mouse.move(0, 0);
        await settled(page);
        const png = await page.screenshot({
          clip: { ...clip, ...WHATS_NEW_MEDIA.crop },
          animations: 'disabled',
          caret: 'hide',
        });
        const webp = join(OUT, `${shot.slug}-${colorScheme}.webp`);
        const { bytes, quality } = await encodeWebp(png, webp);
        console.log(`${webp}: ${(bytes / 1000).toFixed(0)} kB (quality ${quality})`);
      });
    }
  });
}
