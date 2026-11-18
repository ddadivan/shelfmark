import { readEmailList } from './read-email-list';

/** Environment variable with the admin allow-list. */
const ADMIN_EMAILS_ENV = 'ADMIN_EMAILS';

/**
 * The admin allow-list from `ADMIN_EMAILS` (comma-separated, case-insensitive, ASCII only; a
 * non-ASCII entry is ignored). Read at request time on purpose (a cheap string split) so the value
 * is never cached stale. Unset or empty means nobody is an admin (fail closed).
 */
export function readAdminEmails(env: NodeJS.ProcessEnv = process.env): ReadonlySet<string> {
  return readEmailList(ADMIN_EMAILS_ENV, env);
}
