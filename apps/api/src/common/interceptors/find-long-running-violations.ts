import type { RouteScan } from '../auth/models/route-scan.interface';
import { LONG_RUNNING_ROUTES } from './models/long-running-route.const';
import type { LongRunningRoute } from './models/long-running-route.interface';

/**
 * The ways a scan breaks ADR 0051 point 2, as `tag: subject` strings (empty when clean):
 * `long-running-mismatch` (a `@LongRunning()` handler that is not listed, or a listed route without
 * the marker) and `empty-reason`.
 */
export function findLongRunningViolations(
  scan: RouteScan,
  allowed: readonly LongRunningRoute[] = LONG_RUNNING_ROUTES,
): string[] {
  const violations: string[] = [];
  const marked = scan.routes.filter((route) => route.longRunning).map((route) => route.key);
  const listed = allowed.map((route) => `${route.method} ${route.path}`);
  for (const key of marked) {
    if (!listed.includes(key)) violations.push(`long-running-mismatch: ${key}`);
  }
  for (const key of listed) {
    if (!marked.includes(key)) violations.push(`long-running-mismatch: ${key}`);
  }
  for (const route of allowed) {
    if (route.reason.trim() === '') violations.push(`empty-reason: ${route.path}`);
  }
  return violations;
}
