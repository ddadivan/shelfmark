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

  it('carries the folder tile with the shown colour when asked (#418)', () => {
    const [option] = buildFolderOptions(
      [{ ...MOCK_FOLDERS[0], parentId: null, colour: 'rose', icon: '🍋' }],
      (colour) => `shown-${colour}`,
    );
    expect(option).toMatchObject({ colour: 'shown-rose', icon: '🍋' });
  });

  it('does not hang on a cyclic parent and keeps the rest', () => {
    const root: FolderResponse = { ...MOCK_FOLDERS[0], id: 'root', parentId: null };
    const a: FolderResponse = { ...MOCK_FOLDERS[0], id: 'a', parentId: 'b' };
    const b: FolderResponse = { ...MOCK_FOLDERS[0], id: 'b', parentId: 'a' };
    const selfLoop: FolderResponse = { ...MOCK_FOLDERS[0], id: 'self', parentId: 'self' };
    expect(buildFolderOptions([root, a, b, selfLoop]).map((option) => option.id)).toEqual(['root']);
  });
});
