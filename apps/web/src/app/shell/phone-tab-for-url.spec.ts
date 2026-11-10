import { PHONE_TAB } from './models/phone-tab.const';
import { phoneTabForUrl } from './phone-tab-for-url';

describe('phoneTabForUrl', () => {
  it.each([
    ['/library', PHONE_TAB.Library],
    ['/links', PHONE_TAB.Library],
    ['/links?tag=docs', PHONE_TAB.Library],
    ['/unsorted', PHONE_TAB.Library],
    ['/favorites', PHONE_TAB.Library],
    ['/folders/abc', PHONE_TAB.Library],
    ['/recent', PHONE_TAB.Library],
    ['/tags', PHONE_TAB.Tags],
    ['/tags?x=1', PHONE_TAB.Tags],
    ['/settings', PHONE_TAB.You],
    ['/settings#appearance', PHONE_TAB.You],
  ])('%s is under %s', (url, tab) => {
    expect(phoneTabForUrl(url)).toBe(tab);
  });
});
