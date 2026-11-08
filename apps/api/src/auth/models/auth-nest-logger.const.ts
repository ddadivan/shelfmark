import { Logger } from '@nestjs/common';

/** The single Nest logger for everything under `src/auth`. */
export const AUTH_NEST_LOGGER = new Logger('Auth');
