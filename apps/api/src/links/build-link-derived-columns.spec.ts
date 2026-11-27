import { LINK_KIND, linkSiteKey, linkTitleSortKey, normalizeUrl } from '@shelfmark/contracts';
import { describe, expect, it } from 'vitest';
import { buildLinkDerivedColumns } from './build-link-derived-columns';

describe('buildLinkDerivedColumns', () => {
  it('derives every column from the URL and the title', () => {
    const url = 'https://www.YouTube.com/watch?v=1';
    expect(buildLinkDerivedColumns(url, 'Some VIDEO')).toEqual({
      normalizedUrl: normalizeUrl(url),
      titleSortKey: linkTitleSortKey('Some VIDEO'),
      host: linkSiteKey(url),
      kind: LINK_KIND.Video,
    });
  });

  it('keeps a kind and a normalized URL the caller already settled', () => {
    expect(
      buildLinkDerivedColumns('https://example.com/a', 'T', {
        kind: LINK_KIND.Recipe,
        normalizedUrl: 'https://example.com/a?x',
      }),
    ).toMatchObject({ kind: LINK_KIND.Recipe, normalizedUrl: 'https://example.com/a?x' });
  });
});
