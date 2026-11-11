const NON_ASCII = /[^ -~]/;

/**
 * Canonical form of an email for the admin comparison: trimmed and lower-cased, ASCII only. Any
 * non-ASCII character (fullwidth letters, the Kelvin sign, Turkish dotless i, ...) yields `null`:
 * such an address never matches and is dropped from the allow-list, so no Unicode case or
 * compatibility folding can make a look-alike address equal to an admin address. Checked on the
 * raw value, before any normalisation.
 */
export function normalizeAdminEmail(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '' || NON_ASCII.test(trimmed)) return null;
  return trimmed.toLowerCase();
}
