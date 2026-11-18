import type { LongRunningRoute } from './long-running-route.interface';

/**
 * The only routes that may carry `@LongRunning()` (ADR 0051 point 2). `long-running-routes.spec.ts`
 * fails when the markers in the code and this list differ, so escaping the request timeout needs a
 * reviewed change here.
 */
export const LONG_RUNNING_ROUTES: readonly LongRunningRoute[] = [];
