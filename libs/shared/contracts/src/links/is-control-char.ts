const DEL = 0x7f;
const LAST_C0 = 0x1f;

/** C0 controls (U+0000 to U+001F) and DEL (U+007F). */
export function isControlChar(code: number): boolean {
  return code <= LAST_C0 || code === DEL;
}
