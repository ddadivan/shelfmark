import { workspaceRoot } from '@nx/devkit';
import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The mock auth API is for development and e2e builds only (file replacement in
// apps/web/project.json). Build-gated: runs when `nx build web` has produced the output.
const PRODUCTION_OUTPUT = join(workspaceRoot, 'dist/apps/web/browser');
const MOCK_MARKERS = [
  'sm-mock-session',
  'mock-auth-api',
  'MockAuthApi',
  'mock-github',
  'mock-demo',
];

function scriptFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return scriptFiles(path);
    }
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

test.describe('production bundle', () => {
  test.skip(!existsSync(PRODUCTION_OUTPUT), 'run `nx build web` first');

  test('does not contain the mock auth API', () => {
    const files = scriptFiles(PRODUCTION_OUTPUT);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const marker of MOCK_MARKERS) {
        expect(content.includes(marker), `${marker} in ${file}`).toBe(false);
      }
    }
  });
});
