import { isControlChar } from './is-control-char';

const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

function isTextWhitespace(code: number): boolean {
  return code === TAB || code === LINE_FEED || code === CARRIAGE_RETURN;
}

/**
 * True when the value holds a control character. NUL in particular makes PostgreSQL reject the
 * whole statement (a 500 instead of a 400). `allowTextWhitespace` keeps tab, LF and CR legal for
 * multi-line text such as notes.
 */
export function hasControlChars(value: string, allowTextWhitespace = false): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (isControlChar(code) && !(allowTextWhitespace && isTextWhitespace(code))) return true;
  }
  return false;
}
