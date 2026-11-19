/** UTF-8 byte order mark: Excel needs it to read non-ASCII text (Cyrillic) as UTF-8. */
export const CSV_BOM = '﻿';

/** RFC 4180 line end. */
export const CSV_EOL = '\r\n';

/** The columns of the CSV export, in order. */
export const CSV_HEADER = [
  'url',
  'title',
  'folder',
  'tags',
  'note',
  'favorite',
  'kind',
  'created_at',
] as const;

/** A cell that starts with one of these is a formula to a spreadsheet (OWASP CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV field: a formula-looking value gets a leading `'` (the spreadsheet shows it as text),
 * then RFC 4180 quoting when it holds a comma, a quote, CR or LF (quotes doubled).
 */
export function csvField(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** One record (a row), CRLF-terminated. */
export function csvRow(fields: readonly string[]): string {
  return fields.map(csvField).join(',') + CSV_EOL;
}
