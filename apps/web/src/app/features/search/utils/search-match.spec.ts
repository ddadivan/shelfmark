import type { FolderResponse, TagResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { SEARCH_LOCAL_LIMIT } from '../models/search-local-limit.const';
import { matchFolders, matchTags } from './search-match';

const ROOT: FolderResponse = { ...MOCK_FOLDERS[0], id: 'a', name: 'Work', parentId: null };
const CHILD: FolderResponse = { ...ROOT, id: 'b', name: 'Angular', parentId: 'a' };
const pathOf = (id: string): FolderResponse[] => (id === 'b' ? [ROOT, CHILD] : [ROOT]);

function tag(name: string): TagResponse {
  return { id: name, name, linkCount: 1, createdAt: '', updatedAt: '' };
}

describe('matchFolders', () => {
  it('matches the whole path, every word, ignoring case', () => {
    expect(matchFolders([ROOT, CHILD], pathOf, 'work angular').map((m) => m.path)).toEqual([
      'Work / Angular',
    ]);
    expect(matchFolders([ROOT, CHILD], pathOf, 'WORK').map((m) => m.path)).toEqual([
      'Work',
      'Work / Angular',
    ]);
    expect(matchFolders([ROOT, CHILD], pathOf, 'zzz')).toEqual([]);
  });

  it('stops at the limit and skips folders without a path', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...ROOT, id: `f${i}` }));
    expect(matchFolders(many, pathOf, 'work')).toHaveLength(SEARCH_LOCAL_LIMIT);
    expect(matchFolders([ROOT], () => [], 'work')).toEqual([]);
  });
});

describe('matchTags', () => {
  it('matches the name and limits the count', () => {
    expect(matchTags([tag('signals'), tag('docs')], 'sig').map((t) => t.name)).toEqual(['signals']);
    const many = Array.from({ length: 10 }, (_, i) => tag(`tag-${i}`));
    expect(matchTags(many, 'tag')).toHaveLength(SEARCH_LOCAL_LIMIT);
  });
});
