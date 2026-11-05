import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANONYMOUS_KEY = 'shelfmark:allow-anonymous';

/**
 * Marks a route as reachable without a session. Named like Better Auth's
 * decorator so the global auth guard (stage 2) can honour it. Every use must
 * be justified in the PR description.
 *
 * NO-OP until the global AuthGuard from stage 2 exists: all routes are
 * currently public.
 */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);
