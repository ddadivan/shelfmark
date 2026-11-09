#!/usr/bin/env node
// Builds the icon sprite from one SVG file per icon.
//
//   libs/ui/src/icons/<name>.svg  ->  libs/ui/src/assets/icons/sprite.svg  (<symbol id="sm-<name>">)
//                                 ->  libs/ui/src/lib/icon/models/icon-names.const.ts  (ICON_NAMES)
//
// `node scripts/build-icon-sprite.mjs` writes both files; `--check` writes nothing and exits 1
// when they differ from a fresh build (CI and a unit test run it).
//
// The optimiser is hand-written on purpose (no SVGO, issue #210): the sources are trusted files
// in this repository that contain only filled paths, so the job is a strict allowlist, not
// general SVG minification. Anything outside the allowlist (scripts, styles, links, strokes,
// unknown elements or attributes) fails the build instead of reaching the sprite, which also
// keeps active content out of the file the CSP lets the app load. Zero dependencies, nothing
// to audit, and the output is byte-stable (sorted, no timestamps).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = join(ROOT, 'libs/ui/src/icons');
const SPRITE_PATH = join(ROOT, 'libs/ui/src/assets/icons/sprite.svg');
const NAMES_PATH = join(ROOT, 'libs/ui/src/lib/icon/models/icon-names.const.ts');

const VIEW_BOX = '0 0 24 24';
const SYMBOL_PREFIX = 'sm-';

/** Brand marks: the only icons that may keep `fill` (fixed brand colours, documented exception). */
export const BRAND_MARKS = new Set(['google', 'github']);

/** Drawing elements and the attributes each may keep. */
const ELEMENTS = {
  path: ['d', 'fill-rule', 'clip-rule', 'fill'],
  circle: ['cx', 'cy', 'r', 'fill'],
  ellipse: ['cx', 'cy', 'rx', 'ry', 'fill'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill'],
  polygon: ['points', 'fill-rule', 'clip-rule', 'fill'],
};

/** Removed without complaint: they carry no drawing. */
const DROPPED =
  /<!--[\s\S]*?-->|<\?xml[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(title|desc|metadata)\b[\s\S]*?<\/\1>/gi;

const FILL_VALUE = /^(?:#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|currentColor)$/;
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseAttributes(source, where) {
  const attributes = new Map();
  const re = /([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g;
  let rest = source;
  for (const match of source.matchAll(re)) {
    if (attributes.has(match[1])) {
      throw new Error(`${where}: duplicate attribute "${match[1]}"`);
    }
    attributes.set(match[1], match[2]);
    rest = rest.replace(match[0], '');
  }
  if (rest.replace(/\s|\/$/g, '') !== '') {
    throw new Error(`${where}: cannot parse attributes "${source.trim()}"`);
  }
  return attributes;
}

/**
 * Optimises one icon source and returns the inner markup of its `<symbol>`.
 * Pure: `(name, svg text) -> string`.
 */
export function optimizeIcon(name, svg) {
  const where = `${name}.svg`;
  // Strip repeatedly until nothing changes: a single pass can leave a new `<!--` behind when
  // markers nest (`<!<!---->--`). Anything markup-like that survives is then refused outright.
  let text = svg;
  for (let previous = ''; previous !== text;) {
    previous = text;
    text = text.replace(DROPPED, '');
  }
  text = text.trim();
  if (/<!|<\?/.test(text)) {
    throw new Error(`${where}: comments, doctypes and processing instructions must be removable`);
  }
  const root = text.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/);
  if (!root) {
    throw new Error(`${where}: not a single <svg> element`);
  }
  const rootAttributes = parseAttributes(root[1], where);
  const viewBox = rootAttributes.get('viewBox');
  if (viewBox !== undefined && viewBox !== VIEW_BOX) {
    throw new Error(`${where}: viewBox must be "${VIEW_BOX}" (the 24px grid), got "${viewBox}"`);
  }
  for (const key of rootAttributes.keys()) {
    if (/^stroke/.test(key) && rootAttributes.get(key) !== 'none') {
      throw new Error(`${where}: icons are filled outlines, "${key}" is not allowed`);
    }
  }

  const brand = BRAND_MARKS.has(name);
  const children = [];
  let rest = root[2];
  const child = /^\s*<([a-zA-Z]+)\b([^>]*?)\/?>/;
  for (let match = rest.match(child); match; match = rest.match(child)) {
    rest = rest.slice(match[0].length);
    const tag = match[1];
    const allowed = ELEMENTS[tag];
    if (!allowed) {
      throw new Error(`${where}: element <${tag}> is not allowed`);
    }
    if (!match[0].endsWith('/>')) {
      const close = rest.match(new RegExp(`^\\s*</${tag}>`));
      if (!close) {
        throw new Error(`${where}: <${tag}> must be self-closing`);
      }
      rest = rest.slice(close[0].length);
    }
    const attributes = parseAttributes(match[2], where);
    const kept = [];
    for (const [key, value] of attributes) {
      if (key === 'fill') {
        if (!brand || value === 'none') {
          continue; // colour comes from currentColor, except on the brand marks
        }
        if (!FILL_VALUE.test(value)) {
          throw new Error(`${where}: fill "${value}" is not a plain colour`);
        }
      } else if (key === 'stroke' || key.startsWith('stroke-')) {
        if (value !== 'none') {
          throw new Error(`${where}: icons are filled outlines, "${key}" is not allowed`);
        }
        continue;
      } else if (!allowed.includes(key)) {
        throw new Error(`${where}: attribute "${key}" on <${tag}> is not allowed`);
      }
      kept.push(`${key}="${value}"`);
    }
    // Order: drawing data first (as written), `fill` last, so the output is stable.
    kept.sort((a, b) => Number(a.startsWith('fill=')) - Number(b.startsWith('fill=')));
    children.push(`<${tag}${kept.map((attribute) => ` ${attribute}`).join('')}/>`);
  }
  if (rest.trim() !== '') {
    throw new Error(`${where}: unexpected content "${rest.trim().slice(0, 40)}"`);
  }
  if (children.length === 0) {
    throw new Error(`${where}: no drawing found`);
  }
  return children.join('');
}

/** The names of every source file, sorted. */
export function iconNames(dir = ICONS_DIR) {
  const names = readdirSync(dir)
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.slice(0, -4))
    .sort();
  for (const name of names) {
    if (!NAME.test(name)) {
      throw new Error(`${name}.svg: file names are kebab-case`);
    }
  }
  return names;
}

export function buildSprite(names, read) {
  const symbols = names.map(
    (name) =>
      `<symbol id="${SYMBOL_PREFIX}${name}" viewBox="${VIEW_BOX}">${optimizeIcon(name, read(name))}</symbol>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`;
}

export function buildNamesFile(names) {
  const lines = names.map((name) => `  '${name}',`).join('\n');
  return `// Generated by scripts/build-icon-sprite.mjs from libs/ui/src/icons/*.svg. Do not edit:
// add or remove an icon file and run \`npx nx run ui:icons\`.

/** Every icon in \`assets/icons/sprite.svg\` (symbol id without the \`sm-\` prefix), sorted. */
export const ICON_NAMES = [
${lines}
] as const;
`;
}

/** Fresh output for both generated files. */
export function build() {
  const names = iconNames();
  return {
    [SPRITE_PATH]: buildSprite(names, (name) =>
      readFileSync(join(ICONS_DIR, `${name}.svg`), 'utf8'),
    ),
    [NAMES_PATH]: buildNamesFile(names),
  };
}

function main() {
  const files = build();
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files)
      .filter(([path, content]) => !existsSync(path) || readFileSync(path, 'utf8') !== content)
      .map(([path]) => path.slice(ROOT.length + 1));
    if (stale.length > 0) {
      console.error(
        `Generated icon files are out of date: ${stale.join(', ')}.\nRun \`npx nx run ui:icons\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(`Icon sprite is up to date (${iconNames().length} icons).`);
    return;
  }
  for (const [path, content] of Object.entries(files)) {
    writeFileSync(path, content);
  }
  console.log(`Wrote ${iconNames().length} icons to the sprite and ICON_NAMES.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
