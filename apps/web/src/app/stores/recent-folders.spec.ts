import { RECENT_FOLDERS_MAX } from './models/recent-folders-max.const';
import { parseRecentFolders, pushRecentFolder, serializeRecentFolders } from './recent-folders';

describe('recent folders', () => {
  it('reads ids and the unsorted token, dropping junk and duplicates', () => {
    expect(parseRecentFolders('["a","unsorted",7,"","a",null,"b"]')).toEqual(['a', null, 'b']);
  });

  it.each([null, '{not json', '{"a":1}', '"a"'])('reads %s as an empty list', (raw) => {
    expect(parseRecentFolders(raw)).toEqual([]);
  });

  it('keeps at most the maximum', () => {
    const raw = JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(parseRecentFolders(raw)).toHaveLength(RECENT_FOLDERS_MAX);
  });

  it('serializes Unsorted as its token and round-trips', () => {
    const ids = ['a', null, 'b'];
    expect(serializeRecentFolders(ids)).toBe('["a","unsorted","b"]');
    expect(parseRecentFolders(serializeRecentFolders(ids))).toEqual(ids);
  });

  it('puts a target first, once, and drops the oldest past the maximum', () => {
    expect(pushRecentFolder(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(pushRecentFolder(['a'], null)).toEqual([null, 'a']);
    const full = ['a', 'b', 'c', 'd', 'e'];
    expect(pushRecentFolder(full, 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  });
});
