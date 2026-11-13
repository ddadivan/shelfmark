#!/usr/bin/env node
// Writes the localized names of the folder emoji picker's collection (#363).
//
//   apps/web/src/app/features/folders/models/folder-emoji-catalog.const.ts  (the curated emoji)
//   + node_modules/emojibase-data/<lang>/compact.json                       (CLDR names and tags)
//   ->  apps/web/src/app/features/folders/emoji-names/<lang>.json           ({ "🍕": ["pizza", "cheese", …] })
//
// `node scripts/build-folder-emoji.mjs` writes one file per app language; `--check` writes nothing
// and exits 1 when a file differs from a fresh build (a unit test runs it). Only the curated subset
// ships, a few kB per language, loaded lazily by the app on the first open of the picker; the
// emojibase locale files themselves (about 0.5 MB each) never reach the bundle.
//
// emojibase-data is MIT (Miles Johnson); its names and tags come from the Unicode CLDR annotations
// (Unicode License v3). The credit is recorded in libs/ui/CLAUDE.md (Emoji picker).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = join(ROOT, 'apps/web/src/app/features/folders');
const OUT_DIR = join(FOLDERS, 'emoji-names');
const DATA_DIR = join(ROOT, 'node_modules/emojibase-data');

/** App language -> emojibase locale (Portuguese is the Brazilian CLDR `pt`). */
export const LOCALES = { en: 'en', fr: 'fr', de: 'de', it: 'it', es: 'es', pt: 'pt' };
/** Search words kept per emoji besides its name: enough to find it, small enough to ship. */
export const MAX_KEYWORDS = 6;

const VARIATION_SELECTOR = /️/gu;
const strip = (emoji) => emoji.replace(VARIATION_SELECTOR, '');

/** emojibase entries by their emoji without variation selectors. */
function indexEntries(entries) {
  return new Map(entries.map((entry) => [strip(entry.unicode), entry]));
}

/**
 * `{ emoji: [name, ...keywords] }` for every catalogue emoji, in catalogue order. A locale that
 * lacks an emoji falls back to the English entry; English must have them all.
 */
export function buildNames(emoji, entries, fallback) {
  const local = indexEntries(entries);
  const english = indexEntries(fallback);
  const names = {};
  for (const item of emoji) {
    const entry = local.get(strip(item)) ?? english.get(strip(item));
    if (!entry) {
      throw new Error(`build-folder-emoji: emojibase has no entry for ${item}`);
    }
    const label = entry.label ?? entry.annotation;
    // Each word once, ignoring case ("Pommes frites" and "Pommes Frites" are one).
    const seen = new Set([label.toLowerCase()]);
    const keywords = (entry.tags ?? [])
      .filter((tag) => !seen.has(tag.toLowerCase()) && seen.add(tag.toLowerCase()))
      .slice(0, MAX_KEYWORDS);
    names[item] = [label, ...keywords];
  }
  return names;
}

function readJson(path) {
  if (!existsSync(path)) {
    throw new Error(`build-folder-emoji: ${path} not found (npm ci installs emojibase-data)`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** One emoji per line (diffs stay readable); the folder is in `.prettierignore`. */
export function serializeNames(names) {
  const lines = Object.entries(names).map(
    ([emoji, words]) => `  ${JSON.stringify(emoji)}: ${JSON.stringify(words)}`,
  );
  return `{\n${lines.join(',\n')}\n}\n`;
}

export async function buildAll() {
  const { FOLDER_EMOJI_CATALOG } = await import(
    join(FOLDERS, 'models/folder-emoji-catalog.const.ts')
  );
  const emoji = Object.values(FOLDER_EMOJI_CATALOG).flat();
  const fallback = readJson(join(DATA_DIR, 'en/compact.json'));
  return Object.entries(LOCALES).map(([lang, locale]) => ({
    path: join(OUT_DIR, `${lang}.json`),
    content: serializeNames(
      buildNames(emoji, readJson(join(DATA_DIR, locale, 'compact.json')), fallback),
    ),
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const stale = [];
  for (const { path, content } of await buildAll()) {
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== content) {
        stale.push(path);
      }
    } else {
      writeFileSync(path, content);
    }
  }
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.join(', ')}\nRun: node scripts/build-folder-emoji.mjs`);
    process.exit(1);
  }
  console.log(check ? 'Folder emoji names are up to date' : `Wrote ${OUT_DIR}/<lang>.json`);
}
