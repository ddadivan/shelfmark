#!/usr/bin/env node
// Renders contact sheets of the 16px icon set with Playwright (a review tool, not part of the build).
//
//   node scripts/icons-16/contact-sheet.mjs <outDir> [--before <dir-with-old-svgs> name,name,...]
//
// Writes contact-sheet-1x-{light,dark}.png (real 1x pixels, with names), contact-sheet-4x-{light,dark}.png
// (the 1x rasterisation magnified 4x without smoothing, so the pixel grid is visible) and, with
// --before, before-after-<theme>.png (old | new of the redrawn icons, 1x and 8x).
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'libs/ui/src/icons/16');
const THEMES = {
  light: { bg: '#FFFFFF', fg: '#19191C', mute: '#6B6B73' },
  dark: { bg: '#19191C', fg: '#F2F2F4', mute: '#9A9AA3' },
};
const COLS = 10;
const PITCH = 24;

const args = process.argv.slice(2);
const outDir = resolve(args[0] ?? '.');
const beforeAt = args.indexOf('--before');
const beforeDir = beforeAt > -1 ? resolve(args[beforeAt + 1]) : null;
const changed = beforeAt > -1 ? args[beforeAt + 2].split(',') : [];
mkdirSync(outDir, { recursive: true });

const load = (dir, name) => readFileSync(join(dir, `${name}.svg`), 'utf8').match(/d="([^"]+)"/)[1];
const names = readdirSync(SRC)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -4))
  .sort();
const svg = (d) =>
  `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="display:block"><path d="${d}"/></svg>`;
const frame = (t, body) =>
  `<body style="margin:0;background:${t.bg};color:${t.fg};font:11px/1.2 system-ui,sans-serif">${body}</body>`;

const browser = await chromium.launch({ executablePath: process.env['CHROME_PATH'] || undefined });
const page = await browser.newPage({
  viewport: { width: 1400, height: 800 },
  deviceScaleFactor: 1,
});

async function shot(html, path, selector) {
  await page.setContent(html);
  return page.locator(selector).screenshot({ path });
}

for (const [themeName, t] of Object.entries(THEMES)) {
  const cells1 = names
    .map(
      (n) =>
        `<div style="width:120px;height:28px;display:flex;align-items:center;gap:8px;padding-left:8px;box-sizing:border-box">${svg(load(SRC, n))}<span style="color:${t.mute}">${n}</span></div>`,
    )
    .join('');
  await shot(
    frame(
      t,
      `<div id="s" style="display:grid;grid-template-columns:repeat(${COLS},120px);padding:8px">${cells1}</div>`,
    ),
    join(outDir, `contact-sheet-1x-${themeName}.png`),
    '#s',
  );

  const rows = Math.ceil(names.length / COLS);
  const w = COLS * PITCH;
  const h = rows * PITCH;
  const grid = names
    .map(
      (n, i) =>
        `<div style="position:absolute;left:${4 + (i % COLS) * PITCH}px;top:${4 + Math.floor(i / COLS) * PITCH}px">${svg(load(SRC, n))}</div>`,
    )
    .join('');
  const raw = (
    await shot(
      frame(t, `<div id="g" style="position:relative;width:${w}px;height:${h}px">${grid}</div>`),
      join(outDir, '.raw.png'),
      '#g',
    )
  ).toString('base64');
  const cells4 = names
    .map((n, i) => {
      const x = (i % COLS) * PITCH * 4;
      const y = Math.floor(i / COLS) * PITCH * 4;
      return `<div style="width:${PITCH * 4}px"><div style="width:${PITCH * 4}px;height:${PITCH * 4}px;background:url(data:image/png;base64,${raw}) -${x}px -${y}px/${w * 4}px ${h * 4}px;image-rendering:pixelated"></div><div style="text-align:center;color:${t.mute};font-size:10px;height:16px">${n}</div></div>`;
    })
    .join('');
  await shot(
    frame(
      t,
      `<div id="z" style="display:grid;grid-template-columns:repeat(${COLS},${PITCH * 4}px);padding:8px">${cells4}</div>`,
    ),
    join(outDir, `contact-sheet-4x-${themeName}.png`),
    '#z',
  );

  if (beforeDir) {
    const rasterise = async (d) =>
      (
        await shot(
          frame(t, `<div id="p" style="width:16px;height:16px">${svg(d)}</div>`),
          join(outDir, '.raw.png'),
          '#p',
        )
      ).toString('base64');
    const box = (img, label) =>
      `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><div style="display:flex;align-items:center;gap:20px"><img src="data:image/png;base64,${img}" width="16" height="16"><img src="data:image/png;base64,${img}" width="128" height="128" style="image-rendering:pixelated;outline:1px solid ${t.mute}55"></div><span style="color:${t.mute}">${label}</span></div>`;
    const crops = [];
    for (const n of changed) {
      crops.push(
        `<div style="display:flex;gap:28px;align-items:center;padding:10px 14px;border-bottom:1px solid ${t.mute}33"><b style="width:90px;font-weight:500">${n}</b>${box(await rasterise(load(beforeDir, n)), 'before')}${box(await rasterise(load(SRC, n)), 'after')}</div>`,
      );
    }
    await shot(
      frame(
        t,
        `<div id="c" style="display:grid;grid-template-columns:repeat(2,auto);width:max-content">${crops.join('')}</div>`,
      ),
      join(outDir, `before-after-${themeName}.png`),
      '#c',
    );
  }
}
rmSync(join(outDir, '.raw.png'), { force: true });
await browser.close();
