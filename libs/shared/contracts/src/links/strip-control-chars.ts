import { isControlChar } from './is-control-char';

/** Replaces every control character with a space (for text taken from a fetched page). */
export function stripControlChars(value: string): string {
  let result = '';
  for (let index = 0; index < value.length; index++) {
    result += isControlChar(value.charCodeAt(index)) ? ' ' : value.charAt(index);
  }
  return result;
}
