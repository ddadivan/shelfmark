import { describe, expect, it } from 'vitest';
import { urlScrollKey } from './url-scroll-key';

describe('urlScrollKey', () => {
  it('drops the fragment and the preview parameter', () => {
    expect(urlScrollKey('/links?preview=abc#top')).toBe('/links');
    expect(urlScrollKey('/folders/f1?sort=oldest&preview=abc')).toBe('/folders/f1?sort=oldest');
  });

  it('keeps other queries', () => {
    expect(urlScrollKey('/links?tag=a&tag=b')).toBe('/links?tag=a&tag=b');
    expect(urlScrollKey('/links')).toBe('/links');
  });
});
