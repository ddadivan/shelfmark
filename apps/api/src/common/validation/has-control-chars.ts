const DEL = 0x7f;
const LAST_C0 = 0x1f;
const TAB = 0x09;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

/** C0 controls (U+0000 to U+001F) and DEL (U+007F). */
function isControl(code: number): boolean {
  return code <= LAST_C0 || code === DEL;
}

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
    if (isControl(code) && !(allowTextWhitespace && isTextWhitespace(code))) return true;
  }
  return false;
}

/** Replaces every control character with a space (for text taken from a fetched page). */
export function stripControlChars(value: string): string {
  let result = '';
  for (let index = 0; index < value.length; index++) {
    result += isControl(value.charCodeAt(index)) ? ' ' : value.charAt(index);
  }
  return result;
}
