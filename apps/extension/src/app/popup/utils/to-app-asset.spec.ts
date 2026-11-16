import { SHELFMARK_ORIGIN } from '../../core/config/shelfmark-origin.const';
import { toAppAsset } from './to-app-asset';

describe('toAppAsset', () => {
  it('returns undefined for null', () => {
    expect(toAppAsset(null)).toBeUndefined();
  });

  it('makes a same-origin api path absolute on the Shelfmark origin', () => {
    expect(toAppAsset('/api/links/1/image?v=abc')).toBe(
      `${SHELFMARK_ORIGIN}/api/links/1/image?v=abc`,
    );
  });

  it('ignores a pending capture', () => {
    expect(toAppAsset('/api/links/1/image?v=pending')).toBeUndefined();
  });

  it.each([
    'https://evil.example/x.png',
    '//evil.example/x.png',
    '/other/x.png',
    'data:image/png;base64,AA',
  ])('ignores %s, which is not an /api/ path', (path) => {
    expect(toAppAsset(path)).toBeUndefined();
  });
});
