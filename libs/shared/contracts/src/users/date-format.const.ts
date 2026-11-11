/**
 * Settings › Language › Date format (#274). `default` is the language's own medium date; the
 * others fix the order and style whatever the language (month names stay translated):
 * `medium` 10 Nov 2026 (d MMM y), `dmy` 10.11.2026 (dd.MM.yyyy), `mdy` 11/10/2026 (MM/dd/yyyy),
 * `iso` 2026-11-10 (yyyy-MM-dd).
 */
export const DATE_FORMAT = {
  Default: 'default',
  Medium: 'medium',
  Dmy: 'dmy',
  Mdy: 'mdy',
  Iso: 'iso',
} as const;
