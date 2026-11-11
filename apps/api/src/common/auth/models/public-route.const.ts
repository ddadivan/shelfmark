import {
  CRON_ENDPOINT,
  DEMO_ENDPOINT,
  MONITORING_CONFIG_ROUTE,
  MONITORING_TUNNEL_ROUTE,
} from '@shelfmark/contracts';
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
    method: HTTP_METHOD.Get,
    path: `/api${MONITORING_CONFIG_ROUTE}`,
    reason: 'the web app reads the public Sentry DSN before any sign-in (ADR 0032)',
  },
  {
    method: HTTP_METHOD.Post,
    path: `/api${MONITORING_TUNNEL_ROUTE}`,
    reason:
      'browser errors can happen without a session; envelopes for our own DSN only (ADR 0032)',
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
  {
    method: HTTP_METHOD.Get,
    path: CRON_ENDPOINT.TrashCleanup,
    reason:
      'Vercel Cron cannot send a session: authenticated by the CRON_SECRET bearer guard on the handler, fails closed (ADR 0036)',
  },
];
