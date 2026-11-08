import type { AuthSessionResponse } from '@shelfmark/contracts';

/**
 * The 24h demo limit on a mapped session (ADR 0034). A regular user passes through unchanged. A demo
 * user is signed out (`null`) once `demoExpiresAt` has passed, and also when it is missing (fail
 * closed); before that, the session expiry is capped at `demoExpiresAt`, so a sliding refresh can
 * never show a longer life than the sandbox has.
 */
export function enforceDemoExpiry(
  auth: AuthSessionResponse | null,
  now: Date = new Date(),
): AuthSessionResponse | null {
  if (!auth?.user.isDemo) return auth;
  const { demoExpiresAt } = auth.user;
  if (demoExpiresAt === null || Date.parse(demoExpiresAt) <= now.getTime()) return null;
  if (Date.parse(auth.session.expiresAt) <= Date.parse(demoExpiresAt)) return auth;
  return { ...auth, session: { expiresAt: demoExpiresAt } };
}
