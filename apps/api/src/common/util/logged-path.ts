import type { Request } from 'express';
import { isRecord } from './is-record';

/** The public share token segment of a raw path (`/api/public/collections/<token>`). */
const SHARE_TOKEN_SEGMENT = /(\/public\/collections\/)[^/]+/g;

/**
 * The path for a log line: the route pattern (`/api/links/:id`) when a route matched, else the
 * raw path with any public share token replaced by `:token` (a 404 before routing). Never the
 * query string. The share token is a capability, so it must never reach logs (PROJECT.md 5.8).
 */
export function loggedPath(req: Pick<Request, 'baseUrl' | 'path' | 'route'>): string {
  const route: unknown = req.route;
  const pattern = isRecord(route) ? route['path'] : undefined;
  if (typeof pattern === 'string') return `${req.baseUrl}${pattern}`;
  return req.path.replace(SHARE_TOKEN_SEGMENT, '$1:token');
}
