/**
 * The admin allow-list from `ADMIN_EMAILS` (comma-separated, case-insensitive). Read at request
 * time on purpose (a cheap string split) so the value is never cached stale. Unset or empty means
 * nobody is an admin (fail closed).
 */
export function readAdminEmails(env: NodeJS.ProcessEnv = process.env): ReadonlySet<string> {
  const raw = env['ADMIN_EMAILS'] ?? '';
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== ''),
  );
}
