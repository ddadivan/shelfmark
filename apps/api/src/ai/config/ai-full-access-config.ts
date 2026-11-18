import { readEmailList } from '../../config/read-email-list';
import { AI_ENV } from '../models/ai-env.const';

/**
 * Accounts that get Pro and the AI pack from `AI_FULL_ACCESS_EMAILS` (comma-separated,
 * case-insensitive, ASCII only, normalised like `ADMIN_EMAILS`). Read per request, never cached and
 * never written to the database. Unset or empty means nobody (everyone is Free).
 */
export function readAiFullAccessEmails(env: NodeJS.ProcessEnv = process.env): ReadonlySet<string> {
  return readEmailList(AI_ENV.FullAccessEmails, env);
}
