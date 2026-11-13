import { describe, expect, it } from 'vitest';
import { urlPath } from './url-path';

describe('urlPath', () => {
  it('drops the query and the fragment', () => {
    expect(urlPath('/links?sort=oldest')).toBe('/links');
    expect(urlPath('/folders/1#top')).toBe('/folders/1');
    expect(urlPath('/settings/account')).toBe('/settings/account');
  });
});
