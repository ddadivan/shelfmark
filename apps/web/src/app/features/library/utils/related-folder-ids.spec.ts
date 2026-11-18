import type { LinkResponse, MeaningMatch } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { relatedFolderIds } from './related-folder-ids';

function match(folderId: string | null): MeaningMatch {
  const link: LinkResponse = { ...MOCK_LINKS[0], folderId };
  return { link, why: [] };
}

describe('relatedFolderIds', () => {
  it('lists each folder once, best first, Unsorted as null, without unknown folders', () => {
    const items = [match('a'), match(null), match('a'), match('gone'), match('b'), match(null)];
    expect(relatedFolderIds(items, (id) => id !== 'gone')).toEqual(['a', null, 'b']);
    expect(relatedFolderIds([], () => true)).toEqual([]);
  });
});
