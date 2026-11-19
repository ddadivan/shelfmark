// Control characters (C0 and DEL; the API refuses them in text fields), tab and newline included.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;
// The same without newline, for notes.
// eslint-disable-next-line no-control-regex
const CONTROL_BUT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/g;

/** One line of plain text: control characters become spaces, runs of spaces collapse, cut at `max`. */
export function cleanLine(value: string | null | undefined, max: number): string {
  return (value ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

/** A note: newlines kept (CR LF as LF), other control characters become spaces, cut at `max`. */
export function cleanNote(value: string | null | undefined, max: number): string {
  return (value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_BUT_NEWLINE, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
    .trim();
}
