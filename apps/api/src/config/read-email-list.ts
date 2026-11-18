import { normalizeAdminEmail } from './normalize-admin-email';

/**
 * A comma-separated list of emails from the environment (`ADMIN_EMAILS`, `AI_FULL_ACCESS_EMAILS`):
 * case-insensitive, ASCII only (a non-ASCII entry is ignored, see `normalizeAdminEmail`). Read at
 * request time on purpose (a cheap string split) so the value is never cached stale. Unset or empty
 * means nobody (fail closed).
 */
export function readEmailList(name: string, env: NodeJS.ProcessEnv): ReadonlySet<string> {
  const raw = env[name] ?? '';
  const emails = raw
    .split(',')
    .map(normalizeAdminEmail)
    .filter((email): email is string => email !== null);
  return new Set(emails);
}
