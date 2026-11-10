import { normalizeAdminEmail } from './normalize-admin-email';

/**
 * The admin allow-list from `ADMIN_EMAILS` (comma-separated, case-insensitive, ASCII only; a
 * non-ASCII entry is ignored). Read at request time on purpose (a cheap string split) so the value
 * is never cached stale. Unset or empty means nobody is an admin (fail closed).
 */
export function readAdminEmails(env: NodeJS.ProcessEnv = process.env): ReadonlySet<string> {
  const raw = env['ADMIN_EMAILS'] ?? '';
  const emails = raw
    .split(',')
    .map(normalizeAdminEmail)
    .filter((email): email is string => email !== null);
  return new Set(emails);
}
