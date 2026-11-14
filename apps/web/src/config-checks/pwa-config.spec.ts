import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Generator, type Config, type Filesystem } from '@angular/service-worker/config';
import { describe, expect, it } from 'vitest';
import type { NgswManifest } from './models/ngsw-manifest.interface';
import type { WebManifest } from './models/web-manifest.interface';
import type { WebProjectConfig } from './models/web-project-config.interface';
import { readRepoFile } from '../testing/read-repo-file';

// Static checks of the PWA files (manifest, index.html head, ngsw-config.json); moved from the e2e
// suite in #349. The e2e suite keeps the service worker registration in a production build.
const PUBLIC_DIR = 'apps/web/public';
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

const manifest = JSON.parse(readRepoFile(`${PUBLIC_DIR}/manifest.webmanifest`)) as WebManifest;
const head = new DOMParser().parseFromString(readRepoFile('apps/web/src/index.html'), 'text/html');

/** Bytes of a file under `public/`, by its URL path relative to the site root. */
function publicFile(url: string): Buffer {
  return readFileSync(join(process.cwd(), PUBLIC_DIR, url.replace(/^\//, '')));
}

/** Every file of `public/` as a root-relative URL, like the build output lists it. */
function publicUrls(dir = ''): string[] {
  const root = join(process.cwd(), PUBLIC_DIR, dir);
  return readdirSync(root).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(join(root, name)).isDirectory() ? publicUrls(path) : [path];
  });
}

/** The real `ngsw.json` generator over the public files plus a hashed bundle. */
async function generateNgsw(): Promise<NgswManifest> {
  const files = [...publicUrls(), '/index.html', '/main-ABCD1234.js', '/styles-ABCD1234.css'];
  const fs: Filesystem = {
    list: (dir) => Promise.resolve(files.filter((file) => file.startsWith(dir))),
    read: () => Promise.resolve(''),
    hash: () => Promise.resolve('0'),
    write: () => Promise.resolve(),
  };
  const config = JSON.parse(readRepoFile('apps/web/ngsw-config.json')) as Config;
  return (await new Generator(fs, '/').process(config)) as NgswManifest;
}

describe('PWA manifest', () => {
  it('is linked from index.html, valid and installable', () => {
    expect(head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe(
      'manifest.webmanifest',
    );
    expect(manifest.name).toBe('Shelfmark');
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.id).toBe('/');
    expect(manifest.theme_color).toMatch(HEX_COLOUR);
    expect(manifest.background_color).toMatch(HEX_COLOUR);
    expect(manifest.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true);
    expect(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(
      true,
    );
  });

  it('points every icon at an existing PNG of the declared type', () => {
    for (const icon of manifest.icons) {
      expect(icon.type, icon.src).toBe('image/png');
      expect([...publicFile(icon.src).subarray(0, 8)], icon.src).toEqual(PNG_SIGNATURE);
    }
  });

  it('registers the Android share target (GET /share with url, text, title)', () => {
    expect(manifest.share_target).toEqual({
      action: '/share',
      method: 'GET',
      params: { url: 'url', text: 'text', title: 'title' },
    });
  });

  it('declares a theme colour per colour scheme and the iOS meta tags', () => {
    expect(head.querySelectorAll('meta[name="theme-color"]')).toHaveLength(2);
    for (const scheme of ['light', 'dark']) {
      const meta = head.querySelector(
        `meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`,
      );
      expect(meta?.getAttribute('content'), scheme).toMatch(HEX_COLOUR);
    }
    expect(
      head.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content'),
    ).toBe('yes');
    const touchIcon = head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
    expect(touchIcon).toBeTruthy();
    expect([...publicFile(touchIcon ?? '').subarray(0, 8)]).toEqual(PNG_SIGNATURE);
  });
});

describe('service worker config', () => {
  it('generates an ngsw.json that caches the shell but never /api', async () => {
    const ngsw = await generateNgsw();
    expect(ngsw.dataGroups).toEqual([]);
    const urls = ngsw.assetGroups.flatMap((group) => group.urls);
    expect(urls).toContain('/index.html');
    expect(urls).toContain('/main-ABCD1234.js');
    expect(urls.filter((url) => url.startsWith('/api'))).toEqual([]);
    const excluded = ngsw.navigationUrls
      .filter((rule) => !rule.positive)
      .map((rule) => new RegExp(rule.regex));
    expect(excluded.some((re) => re.test('/api/auth/callback/github'))).toBe(true);
    // The share target opens `/share?...`: a navigation that must fall back to the shell.
    expect(excluded.some((re) => re.test('/share'))).toBe(false);
    expect(
      ngsw.navigationUrls.some((rule) => rule.positive && new RegExp(rule.regex).test('/share')),
    ).toBe(true);
  });

  it('ships with the production build, built from this config file', () => {
    const project = JSON.parse(readRepoFile('apps/web/project.json')) as WebProjectConfig;
    expect(project.targets.build.configurations['production']?.serviceWorker).toBe(
      'apps/web/ngsw-config.json',
    );
  });
});
