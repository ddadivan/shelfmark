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
];
