import { SUGGESTION_KIND, SUGGESTION_STATE, type FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { tidyChips } from './tidy-chips';

const FOLDER = MOCK_FOLDERS[0] as FolderResponse;

describe('tidyChips', () => {
  it('puts the folder first, keeps the tags in order and marks left-out chips', () => {
    const chips = tidyChips(
      [
        {
          id: 't1',
          kind: SUGGESTION_KIND.Tag,
          state: SUGGESTION_STATE.Suggested,
          tagName: 'docs',
          folderId: null,
        },
        {
          id: 'f1',
          kind: SUGGESTION_KIND.Folder,
          state: SUGGESTION_STATE.Suggested,
          tagName: null,
          folderId: FOLDER.id,
        },
        {
          id: 'n1',
          kind: SUGGESTION_KIND.NewTag,
          state: SUGGESTION_STATE.Suggested,
          tagName: 'pasta',
          folderId: null,
        },
      ],
      { [FOLDER.id]: FOLDER },
      new Set(['t1']),
      (colour) => `shown-${colour}`,
    );
    expect(chips).toEqual([
      {
        id: 'f1',
        kind: SUGGESTION_KIND.Folder,
        label: FOLDER.name,
        labelKey: 'ai.tidy.chip.folderAdded',
        selected: true,
        folderColour: `shown-${FOLDER.colour}`,
        folderIcon: FOLDER.icon,
      },
      {
        id: 't1',
        kind: SUGGESTION_KIND.Tag,
        label: 'docs',
        labelKey: 'ai.tidy.chip.tag',
        selected: false,
      },
      {
        id: 'n1',
        kind: SUGGESTION_KIND.NewTag,
        label: 'pasta',
        labelKey: 'ai.tidy.chip.newTagAdded',
        selected: true,
      },
    ]);
  });

  it('drops a folder chip whose folder is not known', () => {
    const chips = tidyChips(
      [
        {
          id: 'f1',
          kind: SUGGESTION_KIND.Folder,
          state: SUGGESTION_STATE.Suggested,
          tagName: null,
          folderId: 'gone',
        },
      ],
      {},
      new Set(),
      (colour) => colour,
    );
    expect(chips).toEqual([]);
  });
});
