// Renders the extension icons from the design-system app icon (docs/design/assets/logos).
// 16, 32 and 48 are full bleed; 128 follows the Chrome Web Store rule: 96 px of artwork centred
// with 16 px of transparent padding. Run once after the logo changes:
//   node apps/extension/scripts/build-icons.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '../../..');
const svg = readFileSync(resolve(root, 'docs/design/assets/logos/shelfmark-app-icon.svg'));
const out = (size) => resolve(root, `apps/extension/public/icons/icon-${size}.png`);

for (const size of [16, 32, 48]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(size));
}

const art = await sharp(svg, { density: 384 }).resize(96, 96).png().toBuffer();
await sharp({
  create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: art, left: 16, top: 16 }])
  .png()
  .toFile(out(128));
