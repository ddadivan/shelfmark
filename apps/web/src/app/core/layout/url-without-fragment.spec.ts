import { urlWithoutFragment } from './url-without-fragment';

describe('urlWithoutFragment', () => {
  it('drops the fragment and keeps the query', () => {
    expect(urlWithoutFragment('/links?sort=oldest')).toBe('/links?sort=oldest');
    expect(urlWithoutFragment('/settings/account#your-data')).toBe('/settings/account');
    expect(urlWithoutFragment('/tags')).toBe('/tags');
  });
});
