import { SetMetadata } from '@nestjs/common';
import { LONG_RUNNING_METADATA_KEY } from './models/long-running-metadata-key.const';

/**
 * Exempts a handler from `TimeoutInterceptor` (ADR 0051 point 2). Allowed only on the routes listed
 * in `LONG_RUNNING_ROUTES` (`long-running-routes.spec.ts` fails otherwise); such a handler owns its
 * deadlines, which must end well inside the Vercel `maxDuration`. Never on a controller class.
 */
export const LongRunning = (): MethodDecorator => SetMetadata(LONG_RUNNING_METADATA_KEY, true);
