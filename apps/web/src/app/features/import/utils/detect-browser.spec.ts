import { detectBrowser } from './detect-browser';

const KNOWN = ['chrome', 'edge', 'firefox', 'safari'];

describe('detectBrowser', () => {
  it('tells Edge, Firefox, Chrome and Safari apart', () => {
    expect(detectBrowser('Mozilla/5.0 Chrome/131.0 Safari/537.36 Edg/131.0', KNOWN)).toBe('edge');
    expect(detectBrowser('Mozilla/5.0 Gecko/20100101 Firefox/133.0', KNOWN)).toBe('firefox');
    expect(detectBrowser('Mozilla/5.0 Chrome/131.0 Safari/537.36', KNOWN)).toBe('chrome');
    expect(detectBrowser('Mozilla/5.0 Version/18.1 Safari/605.1.15', KNOWN)).toBe('safari');
  });

  it('falls back to the first known browser', () => {
    expect(detectBrowser('Mozilla/5.0 Version/18.1 Safari/605.1.15', ['chrome', 'edge'])).toBe(
      'chrome',
    );
    expect(detectBrowser('', ['firefox'])).toBe('firefox');
  });
});
