import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { expect, test } from '@playwright/test';

function read(path: string): string {
  return readFileSync(join(workspaceRoot, path), 'utf8');
}

function bgToken(theme: 'light' | 'dark'): string {
  const match = /--bg:\s*(#[0-9a-f]{6})\s*;/i.exec(
    read(`libs/ui/src/styles/tokens/_${theme}.scss`),
  );
  if (!match) {
    throw new Error(`--bg token not found in _${theme}.scss`);
  }
  return match[1].toLowerCase();
}

function metaThemeColor(scheme: 'light' | 'dark'): string | undefined {
  const html = read('apps/web/src/index.html');
  const tag = new RegExp(
    `<meta[^>]*name="theme-color"[^>]*prefers-color-scheme: ${scheme}[^>]*>`,
  ).exec(html)?.[0];
  return /content="([^"]+)"/.exec(tag ?? '')?.[1].toLowerCase();
}

// index.html and the manifest cannot read CSS tokens, so their colours are copies of `--bg`.
test.describe('PWA colours follow the --bg design tokens', () => {
  test('theme-color meta tags equal --bg in each theme', () => {
    expect(metaThemeColor('light')).toBe(bgToken('light'));
    expect(metaThemeColor('dark')).toBe(bgToken('dark'));
  });

  test('manifest theme and background colours equal the light --bg', () => {
    const manifest = JSON.parse(read('apps/web/public/manifest.webmanifest')) as {
      theme_color: string;
      background_color: string;
    };
    expect(manifest.theme_color.toLowerCase()).toBe(bgToken('light'));
    expect(manifest.background_color.toLowerCase()).toBe(bgToken('light'));
  });
});
