// Fails the build when the production bundle contains development-only code.
//
// The mock auth API is bound only in the development and e2e builds (file replacement in
// apps/web/project.json). Markers must survive minification, so they are string literals the
// mock owns, never class names. Other issues append their own markers here (#73).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUNDLE_DIR = join('dist', 'apps', 'web', 'browser');

/** Strings that must never appear in a production bundle. */
export const MOCK_MARKERS = ['sm-mock-session', 'ada@example.com', 'grace@example.com'];

/**
 * Returns every `{ file, marker }` found in the `.js` files under `dir`.
 * Throws when `dir` does not exist (the build has not run).
 */
export function findMarkers(dir, markers = MOCK_MARKERS) {
  if (!existsSync(dir)) {
    throw new Error(`${dir} not found: run the web build first (nx build web)`);
  }
  const found = [];
  for (const entry of readdirSync(dir, { recursive: true })) {
    const file = join(dir, String(entry));
    if (!file.endsWith('.js')) {
      continue;
    }
    const content = readFileSync(file, 'utf8');
    for (const marker of markers) {
      if (content.includes(marker)) {
        found.push({ file, marker });
      }
    }
  }
  return found;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const found = findMarkers(BUNDLE_DIR);
  if (found.length > 0) {
    for (const { file, marker } of found) {
      console.error(`${file} contains "${marker}"`);
    }
    throw new Error('The production bundle contains mock code; build the production configuration');
  }
  console.log(`${BUNDLE_DIR}: no mock markers`);
}
