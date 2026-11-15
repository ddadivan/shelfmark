import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { withMockPreviews } from './with-mock-previews';

describe('withMockPreviews', () => {
  it('gives every link a captured preview path in the previews scenario', () => {
    const [link] = withMockPreviews([{ ...MOCK_LINKS[0], imageUrl: null }], true);
    expect(link?.imageUrl).toBe(`/api/links/${MOCK_LINKS[0].id}/image?v=0123456789abcdef`);
  });

  it('leaves the links alone otherwise', () => {
    const links = [{ ...MOCK_LINKS[0], imageUrl: null }];
    expect(withMockPreviews(links, false)).toBe(links);
  });
});
