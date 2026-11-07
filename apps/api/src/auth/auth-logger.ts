import { Logger } from '@nestjs/common';

type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = new Logger('Auth');
const MAX_MESSAGE_LENGTH = 300;

/** Messages can embed request-controlled values (a rejected URL): no line breaks, bounded length. */
function sanitize(message: string): string {
  // eslint-disable-next-line no-control-regex
  return message.replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Better Auth `logger.log` adapter onto the Nest logger. It forwards level and message only: the
 * extra arguments can hold request data, provider responses or tokens and are dropped.
 */
export function logAuthMessage(level: AuthLogLevel, rawMessage: string): void {
  const message = sanitize(rawMessage);
  switch (level) {
    case 'debug':
      logger.debug(message);
      break;
    case 'info':
      logger.log(message);
      break;
    case 'warn':
      logger.warn(message);
      break;
    case 'error':
      logger.error(message);
      break;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * `onAPIError.onError` handler. Without it Better Auth also prints `error.message` through its own
 * console logger, outside our adapter. Client errors (4xx, rejected callback URLs, bad state) are
 * warnings; everything else is an error. Only the status and the message of Better Auth's own
 * errors are logged; for any other error only its class name, because its message can carry SQL or
 * provider data.
 */
export function logAuthError(error: unknown): void {
  if (
    isRecord(error) &&
    typeof error['status'] === 'string' &&
    typeof error['message'] === 'string'
  ) {
    const statusCode = error['statusCode'];
    const isClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500;
    logAuthMessage(isClientError ? 'warn' : 'error', `${error['status']}: ${error['message']}`);
    return;
  }
  logAuthMessage('error', `Unexpected ${isRecord(error) ? String(error['name']) : 'error'}`);
}
