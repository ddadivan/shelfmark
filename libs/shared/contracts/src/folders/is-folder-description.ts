import { FOLDER_LIMIT } from './folder-limit.const';

/** C0 controls (U+0000 to U+001F, tab and line breaks included) and DEL. */
// eslint-disable-next-line no-control-regex -- the point is to find control characters
const CONTROL = /[\u0000-\u001f\u007f]/u;

/**
 * True for a description a folder may keep once trimmed (#418): at most
 * `FOLDER_LIMIT.DescriptionMax` characters (UTF-16 units, like the API's `MaxLength`) and no
 * control characters (both checked on the trimmed text, like the API). A blank text is valid: it removes the description (`normalizeFolderDescription`).
 */
export function isFolderDescription(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const text = value.trim();
  return text.length <= FOLDER_LIMIT.DescriptionMax && !CONTROL.test(text);
}

/** What is stored for a sent description: the trimmed text, or `null` for a blank one or `null`. */
export function normalizeFolderDescription(value: string | null): string | null {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
}
