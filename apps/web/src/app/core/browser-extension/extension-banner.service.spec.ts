import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EXTENSION_BANNER_DISMISSED_STORAGE_KEY } from '../auth/models/extension-banner-dismissed-storage-key.const';
import { USER_STORAGE_KEYS } from '../auth/models/user-storage-keys.const';
import { SessionScope } from '../auth/session-scope.service';
import { BrowserExtensionService } from './browser-extension.service';
import { ExtensionBannerService } from './extension-banner.service';

function setup(offered = true) {
  const offeredSignal = signal(offered);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: BrowserExtensionService,
        useValue: { offered: offeredSignal, storeUrl: 'https://store.example/shelfmark' },
      },
    ],
  });
  return { banner: TestBed.inject(ExtensionBannerService), offered: offeredSignal };
}

describe('ExtensionBannerService', () => {
  afterEach(() => localStorage.clear());

  it('shows the banner first and no sidebar entry', () => {
    const { banner } = setup();

    expect(banner.bannerShown()).toBe(true);
    expect(banner.entryShown()).toBe(false);
    expect(banner.storeUrl).toBe('https://store.example/shelfmark');
  });

  it('moves the offer to the sidebar once closed, and remembers it on the device', () => {
    const { banner } = setup();

    banner.dismiss();

    expect(banner.bannerShown()).toBe(false);
    expect(banner.entryShown()).toBe(true);
    expect(localStorage.getItem(EXTENSION_BANNER_DISMISSED_STORAGE_KEY)).toBe('1');
  });

  it('starts closed when this device closed it before', () => {
    localStorage.setItem(EXTENSION_BANNER_DISMISSED_STORAGE_KEY, '1');
    const { banner } = setup();

    expect(banner.bannerShown()).toBe(false);
    expect(banner.entryShown()).toBe(true);
  });

  it('offers nothing where the extension is not offered', () => {
    const { banner } = setup(false);

    expect(banner.bannerShown()).toBe(false);
    banner.dismiss();
    expect(banner.entryShown()).toBe(false);
  });

  it('forgets the closed banner when the session ends (a per-user key)', () => {
    const { banner } = setup();
    banner.dismiss();

    TestBed.inject(SessionScope).end();

    expect(USER_STORAGE_KEYS).toContain(EXTENSION_BANNER_DISMISSED_STORAGE_KEY);
    expect(localStorage.getItem(EXTENSION_BANNER_DISMISSED_STORAGE_KEY)).toBeNull();
    expect(banner.bannerShown()).toBe(true);
  });
});
