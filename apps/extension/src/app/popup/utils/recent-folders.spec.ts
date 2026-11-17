import { RECENT_FOLDERS_KEY } from '../models/recent-folders-key.const';
import { readRecentFolders, rememberRecentFolder } from './recent-folders';

describe('recent folders', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('reads an empty list when nothing is stored', () => {
    expect(readRecentFolders()).toEqual([]);
  });

  it('reads an empty list when the stored value is not JSON', () => {
    localStorage.setItem(RECENT_FOLDERS_KEY, '{nope');
    expect(readRecentFolders()).toEqual([]);
  });

  it('reads an empty list when the stored value is not an array', () => {
    localStorage.setItem(RECENT_FOLDERS_KEY, '{"a":1}');
    expect(readRecentFolders()).toEqual([]);
  });

  it('keeps only strings and null from the stored array', () => {
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(['a', 3, null, {}, 'b']));
    expect(readRecentFolders()).toEqual(['a', null, 'b']);
  });

  it('puts the newest folder first and keeps at most three', () => {
    for (const id of ['a', 'b', 'c', 'd']) rememberRecentFolder(id);
    expect(readRecentFolders()).toEqual(['d', 'c', 'b']);
  });

  it('moves an existing folder to the front without duplicating it', () => {
    for (const id of ['a', 'b', 'c']) rememberRecentFolder(id);
    rememberRecentFolder('a');
    expect(readRecentFolders()).toEqual(['a', 'c', 'b']);
  });

  it('remembers Unsorted as null', () => {
    rememberRecentFolder('a');
    rememberRecentFolder(null);
    expect(readRecentFolders()).toEqual([null, 'a']);
  });

  it('ignores a storage that throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => rememberRecentFolder('a')).not.toThrow();
  });

  it('reads an empty list when the storage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readRecentFolders()).toEqual([]);
  });
});
