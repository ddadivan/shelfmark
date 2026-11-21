import { describe, expect, it } from 'vitest';
import { previewIdOfUrl } from './preview-id-of-url';

describe('previewIdOfUrl', () => {
  it('reads ?preview=', () => {
    expect(previewIdOfUrl('/links?preview=abc')).toBe('abc');
    expect(previewIdOfUrl('/folders/f?sort=oldest&preview=abc#x')).toBe('abc');
  });

  it('is null without a value', () => {
    expect(previewIdOfUrl('/links')).toBeNull();
    expect(previewIdOfUrl('/links?preview=')).toBeNull();
    expect(previewIdOfUrl('/links#preview=abc')).toBeNull();
  });

  it('is null on a page that cannot show the preview', () => {
    expect(previewIdOfUrl('/unsorted/tidy?preview=abc')).toBeNull();
    expect(previewIdOfUrl('/recent?preview=abc')).toBeNull();
  });
});
