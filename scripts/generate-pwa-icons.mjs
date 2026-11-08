// Renders the PWA icons from the design app icon (docs/design/assets/logos/shelfmark-app-icon.svg).
//
// Run manually when the logo changes: `node scripts/generate-pwa-icons.mjs`, then commit the PNGs
// in apps/web/public/icons. It uses Chromium from the Playwright dev dependency, so no extra
// package is needed; the output is not part of the build. The PNG bytes depend on the Chromium
// version, so they are not byte-deterministic across versions: regenerate only when the logo
// changes, not to "refresh" the files.
//   - icon-192.png / icon-512.png: purpose "any", the rounded app icon on a transparent ground
//   - icon-maskable-512.png: purpose "maskable", full-bleed square (the mark sits inside the 80%
//     safe zone, so any launcher mask keeps it whole)
//   - apple-touch-icon.png: 180px full-bleed square (iOS applies its own rounding)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const source = readFileSync(
  join('docs', 'design', 'assets', 'logos', 'shelfmark-app-icon.svg'),
  'utf8',
);
const outDir = join('apps', 'web', 'public', 'icons');
const roundedRect = /<rect width="32" height="32" rx="7"/;
if (!roundedRect.test(source)) {
  throw new Error('shelfmark-app-icon.svg changed: update the full-bleed replacement');
}
const rounded = source;
const fullBleed = source.replace(roundedRect, '<rect width="32" height="32"');

const icons = [
  { file: 'icon-192.png', size: 192, svg: rounded, transparent: true },
  { file: 'icon-512.png', size: 512, svg: rounded, transparent: true },
  { file: 'icon-maskable-512.png', size: 512, svg: fullBleed, transparent: false },
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed, transparent: false },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const { file, size, svg, transparent } of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const sized = svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`,
    );
    const png = await page.screenshot({ omitBackground: transparent, type: 'png' });
    writeFileSync(join(outDir, file), png);
    await page.close();
    console.log(`Wrote ${join(outDir, file)} (${png.length} bytes)`);
  }
} finally {
  await browser.close();
}
