import { captureException, isInitialized, withScope } from '@sentry/node';

/** Sends an exception to Sentry tagged with the request id. No-op when the SDK is not started. */
export function reportException(exception: unknown, requestId: string): void {
  if (!isInitialized()) return;
  withScope((scope) => {
    scope.setTag('requestId', requestId);
    captureException(exception);
  });
}
