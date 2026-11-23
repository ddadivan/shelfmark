import { describe, expect, it } from 'vitest';
import type { WebManifest } from './models/web-manifest.interface';
import { readRepoFile } from '../testing/read-repo-file';

// index.html and the manifest cannot read CSS tokens, so their colours are copies of `--bg`.
// Moved from the e2e suite in #349 (no browser needed).
const SCHEMES = ['light', 'dark'] as const;

function bgToken(theme: (typeof SCHEMES)[number]): string {
  const match = /--bg:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\s*;/i.exec(
    readRepoFile(`libs/ui/src/styles/tokens/_${theme}.scss`),
  );
  if (!match?.[1]) {
    throw new Error(`--bg token not found in _${theme}.scss`);
  }
  const hex = match[1].toLowerCase();
  // Short hex (stylelint's color-hex-length) is expanded to compare with index.html and the manifest.
  return hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
}

function metaThemeColor(scheme: (typeof SCHEMES)[number]): string | undefined {
  const head = new DOMParser().parseFromString(
    readRepoFile('apps/web/src/index.html'),
    'text/html',
  );
  return head
    .querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`)
    ?.getAttribute('content')
    ?.toLowerCase();
}

describe('PWA colours follow the --bg design tokens', () => {
  it('theme-color meta tags equal --bg in each theme', () => {
    for (const scheme of SCHEMES) {
      expect(metaThemeColor(scheme), scheme).toBe(bgToken(scheme));
    }
  });

  it('manifest theme and background colours equal the light --bg', () => {
    const manifest = JSON.parse(
      readRepoFile('apps/web/public/manifest.webmanifest'),
    ) as WebManifest;
    expect(manifest.theme_color.toLowerCase()).toBe(bgToken('light'));
    expect(manifest.background_color.toLowerCase()).toBe(bgToken('light'));
  });
});
