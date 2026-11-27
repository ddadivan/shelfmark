import { STORAGE_KEY } from '../app/core/storage/models/storage-key.const';
import { describe, expect, it } from 'vitest';
import { EXTENSION_BROWSER_BRAND } from '../app/core/browser-extension/models/extension-browser-brand.const';
import { OTHER_CHROMIUM_BRAND } from '../app/core/browser-extension/models/other-chromium-brand.const';
import { APP_PATH } from '../app/models/app-path.const';
import { readRepoFile } from '../testing/read-repo-file';

// public/boot-skeleton.js runs before the app and cannot import its constants (#490): it repeats
// the ones that decide the extension banner, and both stylesheets repeat the banner's height.
const script = readRepoFile('apps/web/public/boot-skeleton.js');
const BANNER_HEIGHT = 'block-size: rem(64px);';

describe('boot-skeleton.js and the extension banner', () => {
  it('reads the same storage keys as the app (the session hint, the theme, the dismissed banner)', () => {
    for (const key of [
      STORAGE_KEY.SessionHint,
      STORAGE_KEY.Theme,
      STORAGE_KEY.ExtensionBannerDismissed,
    ]) {
      expect(script).toContain(`'${key}'`);
    }
  });

  it('knows the same browser brands as isExtensionBrowser', () => {
    for (const brand of [
      ...Object.values(EXTENSION_BROWSER_BRAND),
      ...Object.values(OTHER_CHROMIUM_BRAND),
    ]) {
      expect(script, brand).toContain(`'${brand}'`);
    }
  });

  it('holds the place of a banner as tall as the real one', () => {
    expect(readRepoFile('apps/web/src/_boot-skeleton.scss')).toContain(BANNER_HEIGHT);
    expect(
      readRepoFile(
        'apps/web/src/app/features/library/components/extension-banner/extension-banner.component.scss',
      ),
    ).toContain(BANNER_HEIGHT);
  });
});

// The skeleton's main area follows the address (`html[data-boot-page]`): the script picks the
// variant from the path and the markup and stylesheet draw it.
describe('boot-skeleton.js and the page variants', () => {
  const styles = readRepoFile('apps/web/src/_boot-skeleton.scss');
  const markup = readRepoFile('apps/web/src/index.html');
  const PATHS: readonly (readonly [string, string])[] = [
    [`/${APP_PATH.Today}`, 'today'],
    [`/${APP_PATH.Recent}`, 'recent'],
    [`/${APP_PATH.Trash}`, 'trash'],
    [`/${APP_PATH.Reminders}`, 'reminders'],
    [`/${APP_PATH.Revisit}`, 'revisit'],
    [`/${APP_PATH.Tags}`, 'tags'],
    [`/${APP_PATH.Import}`, 'import'],
    [`/${APP_PATH.Ask}`, 'ask'],
    [`/${APP_PATH.Tidy}`, 'tidy'],
    [`/${APP_PATH.Library}`, 'library-tab'],
    [`/${APP_PATH.Settings}`, 'settings'],
  ];

  it.each(PATHS)('%s draws the %s page', (path, variant) => {
    expect(script).toContain(path.slice(1));
    expect(script).toContain(`'${variant}'`);
    expect(styles).toContain(`data-boot-page='${variant}'`);
  });

  it('keeps the library blocks for every other address and has the page areas in the markup', () => {
    expect(script).toContain('return null;');
    for (const area of [
      'boot__lib',
      'boot__today',
      'boot__recent',
      'boot__trash',
      'boot__generic',
      'boot__ask',
    ]) {
      expect(markup, area).toContain(area);
    }
  });

  it('draws a card as tall as the real one: 4:3 preview, meta, title, source, tags', () => {
    expect(styles).toContain('aspect-ratio: 4 / 3');
    for (const row of ['meta', 'title', 'source', 'tags']) {
      expect(markup).toContain(`boot__card-row--${row}`);
    }
  });
});
