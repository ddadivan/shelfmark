import { LINK_LIMIT } from '@shelfmark/contracts';
import type { WindowTab } from '../../core/chrome/models/window-tab.interface';
import { toTabEntries } from './to-tab-entries';

const tab = (id: number, url: string | null, extra: Partial<WindowTab> = {}): WindowTab => ({
  id,
  active: false,
  url,
  title: `Tab ${id}`,
  favIconUrl: null,
  ...extra,
});

describe('toTabEntries', () => {
  it('keeps only http(s) pages', () => {
    const entries = toTabEntries([
      tab(1, 'https://a.test/'),
      tab(2, 'chrome://extensions'),
      tab(3, 'file:///tmp/x.html'),
      tab(4, 'about:blank'),
      tab(5, null),
    ]);
    expect(entries.map((entry) => entry.tabId)).toEqual([1]);
  });

  it('leaves out tabs the API would reject (credentials, control characters, too long)', () => {
    const tooLong = `https://a.test/${'x'.repeat(LINK_LIMIT.UrlMax)}`;
    const entries = toTabEntries([
      tab(1, 'https://a.test/'),
      tab(2, 'https://user:pw@a.test/'),
      tab(3, tooLong),
      tab(4, 'https://a.test/a\u0000b'),
    ]);
    expect(entries.map((entry) => entry.tabId)).toEqual([1]);
  });

  it('lists a repeated address once, the first tab winning, ignoring fragment and utm', () => {
    const entries = toTabEntries([
      tab(1, 'https://a.test/post'),
      tab(2, 'https://a.test/post#top'),
      tab(3, 'https://A.test/post/?utm_source=x'),
      tab(4, 'https://a.test/other'),
    ]);
    expect(entries.map((entry) => entry.tabId)).toEqual([1, 4]);
  });

  it('puts the tab the popup was opened on first', () => {
    const entries = toTabEntries([
      tab(1, 'https://a.test/'),
      tab(2, 'https://b.test/', { active: true }),
    ]);
    expect(entries.map((entry) => entry.tabId)).toEqual([2, 1]);
  });

  it('reads host, letter, title and the favicon hint', () => {
    const [entry] = toTabEntries([
      tab(1, 'https://www.angular.dev/guide', {
        title: 'Guide',
        favIconUrl: 'https://www.angular.dev/icon.png',
      }),
    ]);
    expect(entry).toMatchObject({
      host: 'angular.dev',
      letter: 'A',
      title: 'Guide',
      titleFromTab: true,
      faviconUrl: 'https://www.angular.dev/icon.png',
      saved: false,
    });
  });

  it('drops a favicon address that is not http(s) and uses the host for a blank title', () => {
    const [entry] = toTabEntries([
      tab(1, 'https://a.test/', { title: ' ', favIconUrl: 'data:image/png;base64,AA' }),
    ]);
    expect(entry?.faviconUrl).toBeNull();
    expect(entry).toMatchObject({ title: 'a.test', titleFromTab: false });
  });

  it('gives every tab its own idempotency key', () => {
    const entries = toTabEntries([tab(1, 'https://a.test/'), tab(2, 'https://b.test/')]);
    expect(new Set(entries.map((entry) => entry.idempotencyKey)).size).toBe(2);
  });

  it('stops at the batch limit', () => {
    const many = Array.from({ length: LINK_LIMIT.BatchMax + 20 }, (_, i) =>
      tab(i, `https://a.test/${i}`),
    );
    expect(toTabEntries(many)).toHaveLength(LINK_LIMIT.BatchMax);
  });
});
