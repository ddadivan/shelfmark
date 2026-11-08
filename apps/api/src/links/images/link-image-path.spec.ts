import { LINK_IMAGE_KIND } from '@shelfmark/contracts';
import { LINK_IMAGE_SEGMENT, linkImagePath } from './link-image-path';

describe('linkImagePath', () => {
  const sha = 'abcdef0123456789ffffffffffffffffffffffffffffffffffffffffffffffff';

  it('builds the same-origin path with a 16 character version', () => {
    expect(linkImagePath('id-1', LINK_IMAGE_KIND.Favicon, sha)).toBe(
      '/api/links/id-1/favicon?v=abcdef0123456789',
    );
    expect(linkImagePath('id-1', LINK_IMAGE_KIND.Preview, sha)).toBe(
      '/api/links/id-1/image?v=abcdef0123456789',
    );
  });

  it('has a segment for every kind', () => {
    expect(Object.keys(LINK_IMAGE_SEGMENT).sort()).toEqual(Object.values(LINK_IMAGE_KIND).sort());
  });
});
