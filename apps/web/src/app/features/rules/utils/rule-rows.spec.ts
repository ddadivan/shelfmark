import type { FolderResponse, RuleResponse } from '@shelfmark/contracts';
import { ruleRows } from './rule-rows';

const rule = (fields: Partial<RuleResponse>): RuleResponse => ({
  id: 'r',
  domain: 'youtube.com',
  folderId: null,
  folderAvailable: true,
  tags: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  ...fields,
});
const videos = { id: 'f', name: 'Videos', icon: 'film', colour: 'plum' } as FolderResponse;

describe('ruleRows', () => {
  it('adds the live folder with its shown colour', () => {
    expect(ruleRows([rule({ folderId: 'f' })], { f: videos }, () => 'graphite')).toEqual([
      {
        rule: rule({ folderId: 'f' }),
        folder: { name: 'Videos', icon: 'film', colour: 'graphite' },
        folderTrashed: false,
      },
    ]);
  });

  it('flags a folder in Trash and shows no folder for one the list does not know', () => {
    const [trashed, unknown] = ruleRows(
      [rule({ folderId: 'f', folderAvailable: false }), rule({ folderId: 'x' })],
      { f: videos },
      (colour) => colour,
    );
    expect(trashed).toMatchObject({ folder: null, folderTrashed: true });
    expect(unknown).toMatchObject({ folder: null, folderTrashed: false });
  });
});
