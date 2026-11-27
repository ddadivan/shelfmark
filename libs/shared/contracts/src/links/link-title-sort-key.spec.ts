import { describe, expect, it } from 'vitest';
import { linkTitleSortKey } from './link-title-sort-key';

describe('linkTitleSortKey', () => {
  it('lower-cases the title and keeps everything else', () => {
    expect(linkTitleSortKey('  The ANGULAR Docs 2')).toBe('  the angular docs 2');
    expect(linkTitleSortKey('')).toBe('');
  });
});
