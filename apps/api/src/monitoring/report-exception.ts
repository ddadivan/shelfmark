import { captureException, flush, isInitialized, withScope } from '@sentry/node';
import { FLUSH_TIMEOUT_MS } from './models/flush-timeout-ms.const';
import { REQUEST_ID_TAG } from './models/request-id-tag.const';

/**
 * Sends an exception to Sentry tagged with the request id, then waits (bounded) until it is
 * delivered. Call it after the response was sent: a Vercel function can freeze right after the
 * response, which would lose a queued event. Never throws. No-op when the SDK is not started.
 */
export async function reportException(exception: unknown, requestId: string): Promise<void> {
  if (!isInitialized()) return;
  try {
    withScope((scope) => {
      scope.setTag(REQUEST_ID_TAG, requestId);
      captureException(exception);
    });
    await flush(FLUSH_TIMEOUT_MS);
  } catch {
    // Monitoring must never turn into an error of its own.
  }
}
