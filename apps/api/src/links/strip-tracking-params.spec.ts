// The implementation lives in the contracts library (shared with the web app), which has no test
// runner of its own: its regression tests run here.
import {
  isTrackingParam,
  stripTrackingParams,
  TRACKING_QUERY_PARAMS,
  TRACKING_QUERY_PARAM_PREFIXES,
} from '@shelfmark/contracts';

describe('stripTrackingParams', () => {
  it.each([
    ['https://example.com/a?utm_source=x&id=7', 'https://example.com/a?id=7'],
    ['https://example.com/a?id=7&utm_source=x', 'https://example.com/a?id=7'],
    ['https://example.com/a?UTM_Medium=x&utm_campaign=y', 'https://example.com/a'],
    ['https://example.com/a?fbclid=abc', 'https://example.com/a'],
    ['https://example.com/a?gclid=1&q=shoes&mc_cid=2&mc_eid=3', 'https://example.com/a?q=shoes'],
    ['https://example.com/a?FBCLID=abc&page=2#top', 'https://example.com/a?page=2#top'],
    ['https://example.com/a?utm_source=x#top', 'https://example.com/a#top'],
    // An encoded name is matched by its decoded form.
    ['https://example.com/a?utm%5Fsource=x&b=1', 'https://example.com/a?b=1'],
    // Empty segments of a stripped query are dropped with it.
    ['https://example.com/a?&utm_source=x&&b=1', 'https://example.com/a?b=1'],
  ])('%s -> %s', (input, expected) => {
    expect(stripTrackingParams(input)).toBe(expected);
  });

  it.each([
    'https://example.com/a?id=7&q=a+b&x=%20y&empty=&flag',
    'https://example.com/a?ref=newsletter&source=feed&utm=1&gclidx=2',
    'https://Example.COM/Path/?b=2&a=1#utm_source=x',
    'https://example.com/a',
    'https://example.com/a?',
    'https://example.com/a#?utm_source=x',
    'mailto:a@example.com?utm_source=x',
    'not a url ?utm_source=x',
  ])('keeps %s as written', (input) => {
    expect(stripTrackingParams(input)).toBe(input);
  });

  it('knows every listed name and prefix, case-insensitively', () => {
    for (const name of TRACKING_QUERY_PARAMS) {
      expect(isTrackingParam(name)).toBe(true);
      expect(isTrackingParam(name.toUpperCase())).toBe(true);
      expect(name).toBe(name.toLowerCase());
    }
    for (const prefix of TRACKING_QUERY_PARAM_PREFIXES) {
      expect(isTrackingParam(`${prefix}anything`)).toBe(true);
    }
    expect(isTrackingParam('id')).toBe(false);
    expect(isTrackingParam('ref')).toBe(false);
    expect(isTrackingParam('q')).toBe(false);
  });
});
