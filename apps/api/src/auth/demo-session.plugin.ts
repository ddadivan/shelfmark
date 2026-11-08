import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { demoSessionBodySchema } from './demo-session-body.schema';
import { DEMO_SESSION_PLUGIN } from './models/demo-session-plugin.const';
import { toAuthSessionResponse } from './to-auth-session-response';

const MS_PER_SECOND = 1000;

/**
 * Starts a session for an existing demo user without OAuth (#67, ADR 0034). The endpoint is
 * `SERVER_ONLY`: Better Auth never registers it on the HTTP router, so it is callable only through
 * `auth.api.createDemoSession` from `DemoService`. Even so it fails closed: the user must be a demo
 * user with an expiry in the future, and the session (and its cookie) ends exactly at that expiry,
 * not after the regular 7 days.
 */
export function demoSessionPlugin() {
  return {
    id: DEMO_SESSION_PLUGIN.Id,
    endpoints: {
      createDemoSession: createAuthEndpoint.serverOnly(
        { method: 'POST', body: demoSessionBodySchema },
        async (ctx) => {
          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          // The plugin does not see the additional fields in its types: read them as unknown.
          const expiresAt: unknown = user ? Reflect.get(user, 'demoExpiresAt') : undefined;
          if (
            !user ||
            Reflect.get(user, 'isDemo') !== true ||
            !(expiresAt instanceof Date) ||
            expiresAt.getTime() <= Date.now()
          ) {
            throw new APIError('FORBIDDEN', { message: 'Not an active demo user' });
          }
          // `false` = remember me: a persistent cookie, capped to the demo lifetime below. The fourth
          // argument (`overrideAll`) is required: without it Better Auth ignores `expiresAt` in the
          // override and keeps the regular 7 days (found by the spike, pinned by a spec).
          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            false,
            { expiresAt },
            true,
          );
          const maxAge = Math.max(
            1,
            Math.floor((expiresAt.getTime() - Date.now()) / MS_PER_SECOND),
          );
          await setSessionCookie(ctx, { session, user }, false, { maxAge });
          return ctx.json(toAuthSessionResponse({ user, session }));
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
