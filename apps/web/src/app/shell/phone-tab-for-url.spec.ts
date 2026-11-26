import { PHONE_TAB } from './models/phone-tab.const';
import { phoneTabForUrl } from './phone-tab-for-url';

describe('phoneTabForUrl', () => {
  it.each([
    ['/today', PHONE_TAB.Today],
    ['/library', PHONE_TAB.Library],
    ['/links', null],
    ['/links?tag=docs', null],
    ['/unsorted', null],
    ['/favorites', null],
    ['/folders/abc', null],
    ['/recent', null],
    ['/tags', PHONE_TAB.Tags],
    ['/tags?x=1', PHONE_TAB.Tags],
    ['/ask', PHONE_TAB.Ask],
    ['/settings', PHONE_TAB.You],
    ['/settings#appearance', PHONE_TAB.You],
  ])('%s is under %s (null: no current tab)', (url, tab) => {
    expect(phoneTabForUrl(url)).toBe(tab);
  });
});
