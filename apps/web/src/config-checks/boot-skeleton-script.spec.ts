import { STORAGE_KEY } from '../app/core/storage/models/storage-key.const';
import { describe, expect, it } from 'vitest';
import { EXTENSION_BROWSER_BRAND } from '../app/core/browser-extension/models/extension-browser-brand.const';
import { OTHER_CHROMIUM_BRAND } from '../app/core/browser-extension/models/other-chromium-brand.const';
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
