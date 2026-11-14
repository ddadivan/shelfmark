import { FOLDER_LIMIT, isFolderDescription } from '@shelfmark/contracts';

/**
 * The message of a folder description the API would refuse (#418): too long once trimmed, or a
 * control character inside; `undefined` when it is fine (blank removes it). `translate` gets the key.
 */
export function descriptionError(
  value: string,
  translate: (key: string) => string,
): { kind: string; message: string } | undefined {
  if (value.trim().length > FOLDER_LIMIT.DescriptionMax) {
    return { kind: 'maxLength', message: translate('folders.style.description.tooLong') };
  }
  return isFolderDescription(value)
    ? undefined
    : { kind: 'plain', message: translate('folders.style.description.invalid') };
}
