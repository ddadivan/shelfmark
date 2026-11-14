import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID } from '@shelfmark/contracts/testing';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { SPLIT_RIGHT_KIND } from '../models/split-right-kind.const';
import {
  canSwap,
  dropValue,
  leftDropTarget,
  parseSplitParam,
  resolveSplitTarget,
  splitParamValue,
  swapCommands,
  targetCommands,
} from './split-param';

const FOLDER_A = MOCK_ID.FolderReading;
const FOLDER_B = MOCK_ID.FolderAngular;
const MAP: Record<string, FolderResponse | undefined> = Object.fromEntries(
  MOCK_FOLDERS.map((folder) => [folder.id, folder]),
);
const ALL: LinksFilter = { scope: LINKS_SCOPE.All };
const UNSORTED: LinksFilter = { scope: LINKS_SCOPE.Unsorted };
const IN_A: LinksFilter = { scope: LINKS_SCOPE.Folder, folderId: FOLDER_A };

describe('parseSplitParam', () => {
  it('is closed when the parameter is absent', () => {
    expect(parseSplitParam(undefined)).toEqual({ kind: SPLIT_RIGHT_KIND.Closed });
  });

  it('is the picker for an empty value, an array and other types', () => {
    const picker = { kind: SPLIT_RIGHT_KIND.Picker };
    expect(parseSplitParam('')).toEqual(picker);
    expect(parseSplitParam([FOLDER_A])).toEqual(picker);
    expect(parseSplitParam(5)).toEqual(picker);
    expect(parseSplitParam(null)).toEqual(picker);
  });

  it('reads the unsorted token and a uuid', () => {
    expect(parseSplitParam('unsorted')).toEqual({ kind: SPLIT_RIGHT_KIND.Unsorted });
    expect(parseSplitParam(FOLDER_A.toUpperCase())).toEqual({
      kind: SPLIT_RIGHT_KIND.Folder,
      folderId: FOLDER_A,
    });
  });

  it('is the picker for a value that is not a uuid or is too long', () => {
    const picker = { kind: SPLIT_RIGHT_KIND.Picker };
    expect(parseSplitParam('folder-1')).toEqual(picker);
    expect(parseSplitParam(`${FOLDER_A}x`)).toEqual(picker);
    expect(parseSplitParam('a'.repeat(5000))).toEqual(picker);
  });
});

describe('resolveSplitTarget', () => {
  const folder = { kind: SPLIT_RIGHT_KIND.Folder, folderId: FOLDER_B } as const;

  it('gives a known folder once the folders have loaded', () => {
    expect(resolveSplitTarget(folder, MAP, true, ALL)).toBe(FOLDER_B);
    expect(resolveSplitTarget(folder, MAP, false, ALL)).toBeUndefined();
  });

  it('gives the picker for an unknown or foreign folder', () => {
    const unknown = { kind: SPLIT_RIGHT_KIND.Folder, folderId: MOCK_ID.LinkPasta } as const;
    expect(resolveSplitTarget(unknown, MAP, true, ALL)).toBeUndefined();
  });

  it('gives the picker for the folder the left half shows', () => {
    expect(resolveSplitTarget(folder, MAP, true, { ...IN_A, folderId: FOLDER_B })).toBeUndefined();
    expect(resolveSplitTarget(folder, MAP, true, IN_A)).toBe(FOLDER_B);
  });

  it('gives null for Unsorted unless the left half is Unsorted', () => {
    const unsorted = { kind: SPLIT_RIGHT_KIND.Unsorted } as const;
    expect(resolveSplitTarget(unsorted, MAP, false, ALL)).toBeNull();
    expect(resolveSplitTarget(unsorted, MAP, true, UNSORTED)).toBeUndefined();
  });

  it('gives the picker when closed or without a target', () => {
    expect(resolveSplitTarget({ kind: SPLIT_RIGHT_KIND.Closed }, MAP, true, ALL)).toBeUndefined();
    expect(resolveSplitTarget({ kind: SPLIT_RIGHT_KIND.Picker }, MAP, true, ALL)).toBeUndefined();
  });
});

describe('splitParamValue', () => {
  it('writes a folder id, the unsorted token and an empty picker', () => {
    expect(splitParamValue(FOLDER_A)).toBe(FOLDER_A);
    expect(splitParamValue(null)).toBe('unsorted');
    expect(splitParamValue(undefined)).toBe('');
  });
});

describe('leftDropTarget and canSwap', () => {
  it('names the folder or Unsorted of the left half, nothing for other lists', () => {
    expect(leftDropTarget(IN_A)).toBe(FOLDER_A);
    expect(leftDropTarget(UNSORTED)).toBeNull();
    expect(leftDropTarget(ALL)).toBeUndefined();
    expect(leftDropTarget({ scope: LINKS_SCOPE.Favorites })).toBeUndefined();
  });

  it('swaps only a folder or Unsorted with a shown target', () => {
    expect(canSwap(IN_A, FOLDER_B)).toBe(true);
    expect(canSwap(UNSORTED, FOLDER_B)).toBe(true);
    expect(canSwap(IN_A, null)).toBe(true);
    expect(canSwap(IN_A, undefined)).toBe(false);
    expect(canSwap(ALL, FOLDER_B)).toBe(false);
    expect(canSwap({ scope: LINKS_SCOPE.Favorites }, null)).toBe(false);
  });
});

describe('swapCommands', () => {
  it('goes to the right folder with the old left folder as ?split', () => {
    expect(swapCommands(IN_A, FOLDER_B)).toEqual({
      commands: ['/', 'folders', FOLDER_B],
      queryParams: { split: FOLDER_A },
    });
  });

  it('goes to Unsorted, or leaves it, with the matching token', () => {
    expect(swapCommands(IN_A, null)).toEqual({
      commands: ['/', 'unsorted'],
      queryParams: { split: FOLDER_A },
    });
    expect(swapCommands(UNSORTED, FOLDER_B)).toEqual({
      commands: ['/', 'folders', FOLDER_B],
      queryParams: { split: 'unsorted' },
    });
  });

  it('is null when the halves cannot trade places', () => {
    expect(swapCommands(ALL, FOLDER_B)).toBeNull();
    expect(swapCommands(IN_A, undefined)).toBeNull();
  });
});

describe('targetCommands', () => {
  it('is the route of a folder or of Unsorted', () => {
    expect(targetCommands(FOLDER_A)).toEqual(['/', 'folders', FOLDER_A]);
    expect(targetCommands(null)).toEqual(['/', 'unsorted']);
  });
});

describe('dropValue', () => {
  it('is the attribute value of a half: an id, the token, or none for the picker', () => {
    expect(dropValue(FOLDER_A)).toBe(FOLDER_A);
    expect(dropValue(null)).toBe('unsorted');
    expect(dropValue(undefined)).toBeNull();
  });
});
