#!/usr/bin/env node
// Writes libs/ui/src/icons/16/<name>.svg from the stroked definitions in this folder.
//
//   node scripts/icons-16/generate.mjs            # all icons
//   node scripts/icons-16/generate.mjs add close  # some
//
// The 16px set is drawn on a 16x16 grid with 1.5px strokes, expanded to filled outlines (the
// sprite optimiser forbids strokes). Run `npx nx run ui:icons` afterwards to rebuild the sprite.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS_16 } from './icons.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'libs/ui/src/icons/16');

const wanted = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let count = 0;
for (const [name, draw] of Object.entries(ICONS_16)) {
  if (wanted.length > 0 && !wanted.includes(name)) {
    continue;
  }
  const d = draw();
  writeFileSync(
    join(OUT, `${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="${d}"/></svg>\n`,
  );
  count += 1;
}
console.log(`Wrote ${count} icons to libs/ui/src/icons/16.`);
