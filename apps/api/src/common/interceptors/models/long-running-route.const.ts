import { AI_ENDPOINT } from '@shelfmark/contracts';
import { HTTP_METHOD } from '../../auth/models/http-method.const';
import type { LongRunningRoute } from './long-running-route.interface';

/**
 * The only routes that may carry `@LongRunning()` (ADR 0052 point 2). `long-running-routes.spec.ts`
 * fails when the markers in the code and this list differ, so escaping the request timeout needs a
 * reviewed change here.
 */
export const LONG_RUNNING_ROUTES: readonly LongRunningRoute[] = [
  {
    method: HTTP_METHOD.Post,
    path: AI_ENDPOINT.Ask,
    reason:
      'Ask your shelf streams a model answer: first text within 8 s, hard stop at 24 s, inside maxDuration 30 (ADR 0052)',
  },
];
