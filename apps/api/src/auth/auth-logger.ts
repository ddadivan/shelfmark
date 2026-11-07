import { Logger } from '@nestjs/common';

type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = new Logger('Auth');

/**
 * Better Auth `logger.log` adapter onto the Nest logger. It forwards level and message only: the
 * extra arguments can hold request data, provider responses or tokens and are dropped.
 */
export function logAuthMessage(level: AuthLogLevel, message: string): void {
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
