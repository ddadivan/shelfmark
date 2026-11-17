import { isExtensionBrowser } from './is-extension-browser';
import type { BrowserIdentity } from './models/browser-identity.interface';

const GREASE = { brand: 'Not_A Brand', version: '24' };
const CHROMIUM = { brand: 'Chromium', version: '142' };

function hints(brands: string[], mobile = false, platform = 'macOS'): BrowserIdentity {
  return {
    userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36',
    userAgentData: {
      brands: [GREASE, CHROMIUM, ...brands.map((brand) => ({ brand, version: '142' }))],
      mobile,
      platform,
    },
  };
}

const UA = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
  chromeLinux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:145.0) Gecko/20100101 Firefox/145.0',
  safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 OPR/125.0.0.0',
} as const;

describe('isExtensionBrowser', () => {
  it('is false without a navigator', () => {
    expect(isExtensionBrowser(undefined)).toBe(false);
  });

  describe('with userAgentData brands', () => {
    it.each([
      ['Chrome', ['Google Chrome']],
      ['Edge', ['Microsoft Edge']],
      ['Brave', ['Brave']],
      ['Arc (Chromium only)', []],
    ])('accepts desktop %s', (_name, brands) => {
      expect(isExtensionBrowser(hints(brands))).toBe(true);
    });

    it('accepts ChromeOS and Windows platforms', () => {
      expect(isExtensionBrowser(hints(['Google Chrome'], false, 'Chrome OS'))).toBe(true);
      expect(isExtensionBrowser(hints(['Microsoft Edge'], false, 'Windows'))).toBe(true);
    });

    it('rejects phones and Android tablets', () => {
      expect(isExtensionBrowser(hints(['Google Chrome'], true, 'Android'))).toBe(false);
      expect(isExtensionBrowser(hints(['Google Chrome'], false, 'Android'))).toBe(false);
    });

    it.each(['Opera', 'Opera GX', 'Samsung Internet'])('rejects %s', (brand) => {
      expect(isExtensionBrowser(hints([brand]))).toBe(false);
    });

    it('rejects brands that are neither Chromium nor a supported browser', () => {
      expect(
        isExtensionBrowser({
          userAgent: UA.chromeMac,
          userAgentData: { brands: [GREASE], mobile: false, platform: 'macOS' },
        }),
      ).toBe(false);
    });

    it('falls back to the user agent when the brand list is empty', () => {
      expect(
        isExtensionBrowser({
          userAgent: UA.firefox,
          userAgentData: { brands: [], mobile: false, platform: '' },
        }),
      ).toBe(false);
    });
  });

  describe('with the user-agent string only', () => {
    it.each([
      ['Chrome on macOS', UA.chromeMac],
      ['Edge on Windows', UA.edgeWindows],
      ['Chrome on Linux', UA.chromeLinux],
    ])('accepts %s', (_name, userAgent) => {
      expect(isExtensionBrowser({ userAgent })).toBe(true);
    });

    it.each([
      ['Firefox', UA.firefox],
      ['Safari', UA.safari],
      ['Chrome on Android', UA.chromeAndroid],
      ['Chrome on iOS', UA.chromeIos],
      ['Opera', UA.opera],
      ['jsdom', 'Mozilla/5.0 (darwin) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/26.0.0'],
    ])('rejects %s', (_name, userAgent) => {
      expect(isExtensionBrowser({ userAgent })).toBe(false);
    });
  });
});
