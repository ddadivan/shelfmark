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
//   - ../favicon.svg: the rounded app icon as is (modern browsers, sharp at any size)
//   - ../favicon.ico: 16, 32 and 48px PNGs of the rounded icon packed into one ICO (legacy browsers)
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

const publicDir = join('apps', 'web', 'public');
const icoSizes = [16, 32, 48];

/** Renders `svg` at `size` px to PNG bytes. */
async function render(browser, svg, size, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const sized = svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`,
  );
  const png = await page.screenshot({ omitBackground: transparent, type: 'png' });
  await page.close();
  return png;
}

/** Packs PNG images into one ICO file (PNG-compressed entries, supported since Windows Vista). */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

mkdirSync(outDir, { recursive: true });
// CHROME_PATH overrides the browser (for example a preinstalled Chromium), like the Lighthouse config.
const browser = await chromium.launch({ executablePath: process.env['CHROME_PATH'] || undefined });
try {
  for (const { file, size, svg, transparent } of icons) {
    const png = await render(browser, svg, size, transparent);
    writeFileSync(join(outDir, file), png);
    console.log(`Wrote ${join(outDir, file)} (${png.length} bytes)`);
  }

  writeFileSync(join(publicDir, 'favicon.svg'), `${rounded.trim()}\n`);
  console.log(`Wrote ${join(publicDir, 'favicon.svg')}`);

  const images = [];
  for (const size of icoSizes) {
    images.push({ size, png: await render(browser, rounded, size, true) });
  }
  const ico = packIco(images);
  writeFileSync(join(publicDir, 'favicon.ico'), ico);
  console.log(`Wrote ${join(publicDir, 'favicon.ico')} (${ico.length} bytes)`);
} finally {
  await browser.close();
}
