import { isRecord } from '../common/util/is-record';
import { AUTH_NEST_LOGGER as logger } from './models/auth-nest-logger.const';

type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

const MAX_MESSAGE_LENGTH = 300;
const URL_PATTERN = /[a-z][a-z0-9+.-]*:\/\/\S+/gi;
const REDACTED = '<redacted>';

/**
 * Messages can embed request-controlled values (a rejected callback URL): URLs are replaced, line
 * breaks and control characters removed, length bounded.
 */
function sanitize(message: string): string {
  return (
    message
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(URL_PATTERN, REDACTED)
      .slice(0, MAX_MESSAGE_LENGTH)
  );
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

function errorCode(error: Record<string, unknown>): string | undefined {
  const body = error['body'];
  const code = isRecord(body) ? body['code'] : undefined;
  return typeof code === 'string' && /^[A-Z0-9_]{1,80}$/.test(code) ? code : undefined;
}

/**
 * `onAPIError.onError` handler. Without it Better Auth also prints `error.message` through its own
 * console logger, outside our adapter. Client errors (4xx, rejected callback URLs, bad state) are
 * warnings; everything else is an error. For Better Auth's own errors it logs the status, the error
 * `code` and the message with URLs redacted; for any other error only its class name, because its
 * message can carry SQL or provider data.
 */
export function logAuthError(error: unknown): void {
  if (
    isRecord(error) &&
    typeof error['status'] === 'string' &&
    typeof error['message'] === 'string'
  ) {
    const statusCode = error['statusCode'];
    const isClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500;
    const code = errorCode(error);
    logAuthMessage(
      isClientError ? 'warn' : 'error',
      `${error['status']}${code ? ` ${code}` : ''}: ${error['message']}`,
    );
    return;
  }
  logAuthMessage('error', `Unexpected ${isRecord(error) ? String(error['name']) : 'error'}`);
}
