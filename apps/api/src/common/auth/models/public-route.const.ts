import { CRON_ENDPOINT, DEMO_ENDPOINT } from '@shelfmark/contracts';
import { HTTP_METHOD } from './http-method.const';
import type { PublicRoute } from './public-route.interface';

/**
 * The only routes that may carry `@AllowAnonymous()`. `route-protection.spec.ts` fails when the
 * routes in the code and this list differ, so opening a route needs a reviewed change here.
 * `/api/auth/*` and `/api/docs` are mounted outside Nest's router and are not listed.
 */
export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  {
    method: HTTP_METHOD.Get,
    path: '/api/health',
    reason: 'uptime probes and the deploy smoke check',
  },
  {
    method: HTTP_METHOD.Post,
    path: DEMO_ENDPOINT.Create,
    reason:
      'demo sign-in: creates a sandbox user and its session, so there is no session yet (rate limited, Postgres quota and cap, ADR 0034)',
  },
  {
    method: HTTP_METHOD.Get,
    path: CRON_ENDPOINT.DemoCleanup,
    reason:
      'Vercel Cron cannot send a session: authenticated by the CRON_SECRET bearer guard on the handler, fails closed (ADR 0034)',
  },
];
