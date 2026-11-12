import type { FolderResponse } from '@shelfmark/contracts';
import { FOLDER_COLOUR, FOLDER_ICON } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import { buildFolderPickerOptions } from './folder-picker-options';

const same = (colour: FolderResponse['colour']) => colour;

describe('buildFolderPickerOptions', () => {
  it('nests folders under their parent with the icon and the colour', () => {
    const [reading] = MOCK_FOLDERS;
    const options = buildFolderPickerOptions(
      [{ ...MOCK_FOLDERS[0], colour: FOLDER_COLOUR.Plum, icon: FOLDER_ICON.Star }, MOCK_FOLDERS[1]],
      same,
    );
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      id: reading.id,
      name: MOCK_NAME.FolderReading,
      icon: FOLDER_ICON.Star,
      colour: FOLDER_COLOUR.Plum,
    });
    expect(options[0]?.children?.map((child) => child.id)).toEqual([MOCK_ID.FolderAngular]);
  });

  it('shows the colour the account setting allows', () => {
    const options = buildFolderPickerOptions(
      [{ ...MOCK_FOLDERS[0], colour: FOLDER_COLOUR.Plum }],
      () => FOLDER_COLOUR.Graphite,
    );
    expect(options[0]?.colour).toBe(FOLDER_COLOUR.Graphite);
  });

  it('turns a folder with an unknown parent into a root and has no children key on leaves', () => {
    const orphan: FolderResponse = { ...MOCK_FOLDERS[1], parentId: 'missing' };
    const options = buildFolderPickerOptions([orphan], same);
    expect(options.map((option) => option.id)).toEqual([orphan.id]);
    expect(options[0]).not.toHaveProperty('children');
  });

  it('returns nothing for no folders', () => {
    expect(buildFolderPickerOptions([], same)).toEqual([]);
  });
});
