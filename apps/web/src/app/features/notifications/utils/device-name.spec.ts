import { deviceParts, needsHomeScreen } from './device-name';

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('deviceParts', () => {
  it('names the browser and the system', () => {
    expect(deviceParts(CHROME_MAC)).toEqual({ browser: 'Chrome', system: 'macOS' });
    expect(deviceParts(SAFARI_IPHONE)).toEqual({ browser: 'Safari', system: 'iOS' });
    expect(deviceParts('Mozilla/5.0 (Windows NT 10.0) Edg/140.0 Chrome/140.0')).toEqual({
      browser: 'Edge',
      system: 'Windows',
    });
    expect(deviceParts('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Firefox/140.0')).toEqual({
      browser: 'Firefox',
      system: 'Linux',
    });
    expect(deviceParts('Mozilla/5.0 (Linux; Android 15) Chrome/140.0')).toEqual({
      browser: 'Chrome',
      system: 'Android',
    });
    expect(deviceParts('curl/8')).toEqual({ browser: null, system: null });
  });

  it('asks for the Home Screen only on iOS outside an installed app', () => {
    expect(needsHomeScreen(SAFARI_IPHONE, false)).toBe(true);
    expect(needsHomeScreen(SAFARI_IPHONE, true)).toBe(false);
    expect(needsHomeScreen(CHROME_MAC, false)).toBe(false);
  });
});
