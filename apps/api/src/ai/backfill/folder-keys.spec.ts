import { readFolderKeys, toFolderKeysJson } from './folder-keys';

describe('folder keys of a backfill job', () => {
  it('round-trips the key map', () => {
    const map = new Map([
      ['f1', 'a'],
      ['f2', 'b'],
    ]);
    expect(readFolderKeys(toFolderKeysJson(map))).toEqual(map);
  });

  it('reads anything else as no keys and drops non-string ids', () => {
    expect(readFolderKeys(null)).toEqual(new Map());
    expect(readFolderKeys({ folderKeys: [] })).toEqual(new Map());
    expect(readFolderKeys({ folderKeys: { f1: 'a', f2: 3 } })).toEqual(new Map([['f1', 'a']]));
  });
});
