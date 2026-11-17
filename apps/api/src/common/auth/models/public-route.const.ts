import {
  CRON_ENDPOINT,
  DEMO_ENDPOINT,
  MCP_ENDPOINT,
  MONITORING_CONFIG_ROUTE,
  MONITORING_TUNNEL_ROUTE,
  SHARE_ENDPOINT,
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
    path: SHARE_ENDPOINT.PublicCollection,
    reason:
      'a public collection is opened by guests without an account: the 128-bit token is the capability; read-only, notes only when the owner allows, strict per-IP rate limit (ADR 0040)',
  },
  {
    method: HTTP_METHOD.Get,
    path: SHARE_ENDPOINT.PublicFavicon,
    reason:
      'the site icons on a public collection page; only links inside the shared subtree of a live token (ADR 0040)',
  },
  {
    method: HTTP_METHOD.Get,
    path: SHARE_ENDPOINT.PublicImage,
    reason:
      'the preview images on a public collection page; only links inside the shared subtree of a live token (ADR 0040)',
  },
  {
    method: HTTP_METHOD.Get,
    path: CRON_ENDPOINT.TrashCleanup,
    reason:
      'Vercel Cron cannot send a session: authenticated by the CRON_SECRET bearer guard on the handler, fails closed (ADR 0036)',
  },
  {
    method: HTTP_METHOD.Get,
    path: CRON_ENDPOINT.AiSweep,
    reason:
      'Vercel Cron cannot send a session: authenticated by the CRON_SECRET bearer guard on the handler, fails closed (ADR 0048)',
  },
  {
    method: HTTP_METHOD.Post,
    path: MCP_ENDPOINT.Server,
    reason:
      'MCP clients cannot hold a session cookie: authenticated by the personal-token guard (McpTokenGuard) on the handler, fails closed; cookies are never read; read-only tools, per-IP limit and per-token daily cap (ADR 0053)',
  },
  {
    method: HTTP_METHOD.Get,
    path: MCP_ENDPOINT.Server,
    reason: 'the MCP transport probes GET for a server stream: answers 405 without data (ADR 0053)',
  },
  {
    method: HTTP_METHOD.Delete,
    path: MCP_ENDPOINT.Server,
    reason:
      'the MCP transport may DELETE a session: there are none, answers 405 without data (ADR 0053)',
  },
];
