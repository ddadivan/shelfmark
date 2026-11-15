import { FOLDER_LIMIT } from '@shelfmark/contracts';
import { descriptionError } from './description-error';

const translate = (key: string): string => key;

describe('descriptionError', () => {
  it('accepts blank text, short text and text that fits once trimmed', () => {
    expect(descriptionError('', translate)).toBeUndefined();
    expect(descriptionError('Weekend reads', translate)).toBeUndefined();
    expect(
      descriptionError(` ${'x'.repeat(FOLDER_LIMIT.DescriptionMax)} `, translate),
    ).toBeUndefined();
  });

  it('names a text that is too long', () => {
    expect(descriptionError('x'.repeat(FOLDER_LIMIT.DescriptionMax + 1), translate)).toEqual({
      kind: 'maxLength',
      message: 'folders.style.description.tooLong',
    });
  });

  it('names a control character inside', () => {
    expect(descriptionError('a\tb', translate)).toEqual({
      kind: 'plain',
      message: 'folders.style.description.invalid',
    });
  });
});
