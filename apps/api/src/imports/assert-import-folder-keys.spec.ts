import { BadRequestException } from '@nestjs/common';
import { IMPORT_ERROR_MESSAGE, type ImportFolder } from '@shelfmark/contracts';
import { assertImportFolderKeys } from './assert-import-folder-keys';

const folder = (key: string, parentKey: string | null): ImportFolder => ({
  key,
  parentKey,
  name: key,
});

describe('assertImportFolderKeys', () => {
  it('accepts parents before children and an empty list', () => {
    expect(() => assertImportFolderKeys([])).not.toThrow();
    expect(() =>
      assertImportFolderKeys([folder('a', null), folder('b', 'a'), folder('c', 'b')]),
    ).not.toThrow();
  });

  it.each([
    ['a duplicate key', [folder('a', null), folder('a', null)]],
    ['an unknown parent', [folder('a', 'zzz')]],
    ['a parent that comes later', [folder('a', 'b'), folder('b', null)]],
    ['a folder as its own parent', [folder('a', 'a')]],
  ])('rejects %s', (_label, folders) => {
    expect(() => assertImportFolderKeys(folders)).toThrow(
      new BadRequestException(IMPORT_ERROR_MESSAGE.FolderKeys),
    );
  });
});
