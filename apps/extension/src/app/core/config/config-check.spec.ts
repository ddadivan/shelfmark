import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readRepoFile } from '../../../testing/read-repo-file';
import { SHELFMARK_ORIGIN } from './shelfmark-origin.const';

/** Static checks of the extension's manifests, origin constants and store texts (no browser). */

const ROOT = 'apps/extension';

interface Manifest {
  permissions?: string[];
  host_permissions?: string[];
  content_security_policy?: { extension_pages?: string };
  [key: string]: unknown;
}

const BUILDS = [
  {
    name: 'production',
    host: 'https://shelfmark-app.vercel.app/api/*',
    origin: 'https://shelfmark-app.vercel.app',
    originFile: `${ROOT}/src/app/core/config/shelfmark-origin.const.ts`,
  },
  {
    name: 'development',
    host: 'http://localhost:4200/api/*',
    origin: 'http://localhost:4200',
    originFile: `${ROOT}/src/app/core/config/shelfmark-origin.development.const.ts`,
  },
] as const;

const manifest = (name: string): Manifest =>
  JSON.parse(readRepoFile(`${ROOT}/manifest/${name}/manifest.json`)) as Manifest;

describe.each(BUILDS)('$name manifest', ({ name, host, origin, originFile }) => {
  const m = manifest(name);

  it('requests exactly the activeTab permission', () => {
    expect(m.permissions).toEqual(['activeTab']);
  });

  it('requests exactly one host permission, the API of its origin', () => {
    expect(m.host_permissions).toEqual([host]);
  });

  it.each(['key', 'content_scripts', 'background', 'web_accessible_resources'])(
    'has no %s',
    (field) => {
      expect(m).not.toHaveProperty(field);
    },
  );

  it('has a strict content security policy', () => {
    const csp = m.content_security_policy?.extension_pages ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/u);
  });

  it('lets the page connect only to the origin its host permission names', () => {
    expect(m.content_security_policy?.extension_pages).toContain(`connect-src ${origin};`);
  });

  it('has an origin constant equal to the origin of its host permission', () => {
    expect(new URL(host.replace('/*', '')).origin).toBe(origin);
    expect(readRepoFile(originFile)).toContain(`export const SHELFMARK_ORIGIN = '${origin}';`);
  });
});

describe('origin constants', () => {
  it('the build under test uses the development origin (file replacement)', () => {
    expect(SHELFMARK_ORIGIN).toBe('http://localhost:4200');
  });
});

describe('store texts', () => {
  const locales = readdirSync(join(process.cwd(), ROOT, 'public/_locales'));

  it('ships a text file for every app language', () => {
    expect(locales.sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'pt_BR', 'uk']);
  });

  describe.each(locales)('%s messages.json', (locale) => {
    const messages = JSON.parse(
      readRepoFile(`${ROOT}/public/_locales/${locale}/messages.json`),
    ) as Record<string, { message?: string }>;

    it.each(['extName', 'extDescription', 'actionTitle'])('has %s', (key) => {
      expect(messages[key]?.message?.trim()).toBeTruthy();
    });

    it('keeps the description within the store limit of 132 characters', () => {
      expect(messages['extDescription']?.message?.length).toBeLessThanOrEqual(132);
    });
  });
});
