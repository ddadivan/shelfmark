import { FOLDER_LIMIT, IMPORT_LIMIT } from '@shelfmark/contracts';
import type { ImportGroupsAssignment } from '../models/import-groups-assignment.interface';
import type { ImportPlan } from '../models/import-plan.interface';
import type { ParsedImport } from '../models/parsed-import.interface';
import { applyGroups } from './apply-groups';
import { groupsRequest } from './groups-request';

const PLAN: ImportPlan = {
  folders: [{ key: 'f1', parentKey: null, name: 'Dev' }],
  links: [
    { folderKey: 'f1', item: { url: 'https://a.example/', idempotencyKey: 'k1', title: 'A' } },
    { folderKey: null, item: { url: 'https://b.example/', idempotencyKey: 'k2' } },
    { folderKey: null, item: { url: 'https://c.example/', idempotencyKey: 'k3', title: 'C' } },
  ],
  skipped: 0,
};

const PARSED: ParsedImport = {
  folders: [
    { key: 'f1', parentKey: null, name: 'Dev' },
    { key: 'f2', parentKey: 'f1', name: ' Dev ' },
    { key: 'f3', parentKey: null, name: 'Recipes' },
  ],
  links: [],
  notWeb: 0,
};

describe('groupsRequest', () => {
  it('lists title (or the address) and address in plan order, with distinct folder names as hints', () => {
    expect(groupsRequest(PLAN, PARSED)).toEqual({
      links: [
        { title: 'A', url: 'https://a.example/' },
        { title: 'https://b.example/', url: 'https://b.example/' },
        { title: 'C', url: 'https://c.example/' },
      ],
      folderNames: ['Dev', 'Recipes'],
    });
  });

  it('cuts titles, addresses and hints to the API limits and strips control characters', () => {
    const long = 'x'.repeat(1000);
    const plan: ImportPlan = {
      ...PLAN,
      links: [
        {
          folderKey: null,
          item: { url: `https://a.example/${long}`, idempotencyKey: 'k', title: `${long}\u0000y` },
        },
      ],
    };
    const folders = Array.from({ length: IMPORT_LIMIT.GroupFolderNamesMax + 20 }, (_, index) => ({
      key: `f${index}`,
      parentKey: null,
      name: `Folder ${index} ${'z'.repeat(FOLDER_LIMIT.NameMax)}`,
    }));

    const request = groupsRequest(plan, { ...PARSED, folders });

    expect(request.links[0].title).toHaveLength(IMPORT_LIMIT.GroupTitleMax);
    expect(request.links[0].url).toHaveLength(IMPORT_LIMIT.GroupUrlMax);
    expect(request.folderNames).toHaveLength(IMPORT_LIMIT.GroupFolderNamesMax);
    expect(request.folderNames.every((name) => name.length <= FOLDER_LIMIT.NameMax)).toBe(true);
  });
});

describe('applyGroups', () => {
  it('uses the ticked groups as the plan folders and files links by index', () => {
    const assignment: ImportGroupsAssignment = {
      folders: [{ key: 'g1', parentKey: null, name: 'Dev' }],
      places: new Map([
        [0, { folderKey: 'g1' }],
        [2, { folderId: 'existing' }],
      ]),
    };

    const plan = applyGroups(PLAN, assignment);

    expect(plan.folders).toEqual(assignment.folders);
    expect(plan.links.map((link) => [link.folderKey, link.folderId])).toEqual([
      ['g1', undefined],
      [null, undefined],
      [null, 'existing'],
    ]);
    expect(plan.skipped).toBe(0);
  });
});
