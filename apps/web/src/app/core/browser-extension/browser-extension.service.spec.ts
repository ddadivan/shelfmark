import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { ViewportService } from '../layout/viewport.service';
import { EXTENSION_STORE_URL } from '../../models/extension-store-url.const';
import { BrowserExtensionService } from './browser-extension.service';
import { EXTENSION_STORE_HREF } from './extension-store-url.token';

const STORE = 'https://chromewebstore.google.com/detail/shelfmark/abc';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const FIREFOX_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:145.0) Gecko/20100101 Firefox/145.0';

function setup(options: { url?: string; userAgent?: string; desktop?: boolean } = {}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(options.userAgent ?? CHROME_UA);
  const desktop = signal(options.desktop ?? true);
  TestBed.configureTestingModule({
    providers: [
      { provide: ViewportService, useValue: { desktop } },
      ...(options.url === undefined
        ? []
        : [{ provide: EXTENSION_STORE_HREF, useValue: options.url }]),
    ],
  });
  return { service: TestBed.inject(BrowserExtensionService), desktop };
}

describe('BrowserExtensionService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads the store URL constant, empty until the item is published', () => {
    const { service } = setup();

    expect(service.storeUrl).toBe(EXTENSION_STORE_URL);
  });

  it('offers nothing while the store URL is empty', () => {
    const { service } = setup({ url: '' });

    expect(service.offered()).toBe(false);
  });

  it('offers the extension on desktop Chromium once the URL is set', () => {
    const { service } = setup({ url: STORE });

    expect(service.storeUrl).toBe(STORE);
    expect(service.offered()).toBe(true);
  });

  it('offers nothing in a browser without Chrome Web Store extensions', () => {
    const { service } = setup({ url: STORE, userAgent: FIREFOX_UA });

    expect(service.offered()).toBe(false);
  });

  it('follows the viewport: nothing below 64em', () => {
    const { service, desktop } = setup({ url: STORE });

    desktop.set(false);
    expect(service.offered()).toBe(false);
    desktop.set(true);
    expect(service.offered()).toBe(true);
  });
});
