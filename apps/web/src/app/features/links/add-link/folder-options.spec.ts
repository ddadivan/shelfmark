import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { buildFolderOptions } from './folder-options';

describe('buildFolderOptions', () => {
  it('nests folders under their parent', () => {
    expect(buildFolderOptions(MOCK_FOLDERS)).toEqual([
      {
        id: MOCK_ID.FolderReading,
        name: MOCK_NAME.FolderReading,
        children: [{ id: MOCK_ID.FolderAngular, name: MOCK_NAME.FolderAngular }],
      },
    ]);
  });

  it('turns a folder with an unknown parent into a root', () => {
    const orphan: FolderResponse = { ...MOCK_FOLDERS[1], parentId: 'missing' };
    expect(buildFolderOptions([orphan]).map((option) => option.id)).toEqual([orphan.id]);
  });

  it('returns nothing for no folders', () => {
    expect(buildFolderOptions([])).toEqual([]);
  });
});
