import type { AuthSessionResponse } from '@shelfmark/contracts';
import { isRecord } from '../common/util/is-record';

function toIsoString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
}

/**
 * Maps the raw `get-session` result to the contract: exactly the six user fields and
 * `session.expiresAt`. The session token, IP address and user agent never reach the web. Returns
 * `null` for a missing session and for anything that does not have the expected shape (fail closed).
 */
export function toAuthSessionResponse(value: unknown): AuthSessionResponse | null {
  if (!isRecord(value) || !isRecord(value['user']) || !isRecord(value['session'])) {
    return null;
  }
  const { id, name, email, image, isDemo, onboardingCompletedAt } = value['user'];
  const expiresAt = toIsoString(value['session']['expiresAt']);
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    expiresAt === null
  ) {
    return null;
  }
  return {
    user: {
      id,
      name,
      email,
      image: typeof image === 'string' ? image : null,
      isDemo: isDemo === true,
      onboardingCompletedAt: toIsoString(onboardingCompletedAt),
    },
    session: { expiresAt },
  };
}
