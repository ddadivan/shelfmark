import { describe, expect, it } from 'vitest';
import { EXTENSION_BANNER_DISMISSED_STORAGE_KEY } from '../app/core/auth/models/extension-banner-dismissed-storage-key.const';
import { EXTENSION_BROWSER_BRAND } from '../app/core/browser-extension/models/extension-browser-brand.const';
import { OTHER_CHROMIUM_BRAND } from '../app/core/browser-extension/models/other-chromium-brand.const';
import { readRepoFile } from '../testing/read-repo-file';

// public/boot-skeleton.js runs before the app and cannot import its constants (#490): it repeats
// the ones that decide the extension banner, and both stylesheets repeat the banner's height.
const script = readRepoFile('apps/web/public/boot-skeleton.js');
const BANNER_HEIGHT = 'block-size: rem(188px);';

describe('boot-skeleton.js and the extension banner', () => {
  it('reads the same dismissed key as ExtensionBannerService', () => {
    expect(script).toContain(`'${EXTENSION_BANNER_DISMISSED_STORAGE_KEY}'`);
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
