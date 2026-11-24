import { FOLDER_LIMIT } from '@shelfmark/contracts';
import { FOLDER_NAME_ERROR } from '../models/folder-name-error.const';
import { folderNameError } from './folder-name-error';

const t = (key: string, params?: Record<string, number>) =>
  params ? `${key}:${params['max']}` : key;

describe('folderNameError', () => {
  it('accepts a name', () => {
    expect(folderNameError('Learning', t)).toBeUndefined();
  });

  it('refuses an empty or blank name', () => {
    expect(folderNameError('', t)).toEqual({
      kind: FOLDER_NAME_ERROR.Blank,
      message: 'folders.name.required',
    });
    expect(folderNameError('   ', t)?.kind).toBe(FOLDER_NAME_ERROR.Blank);
  });

  it('refuses a name over the limit', () => {
    expect(folderNameError('a'.repeat(FOLDER_LIMIT.NameMax + 1), t)).toEqual({
      kind: FOLDER_NAME_ERROR.TooLong,
      message: `folders.name.tooLong:${FOLDER_LIMIT.NameMax}`,
    });
  });
});
