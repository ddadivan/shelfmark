import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ResettableThrottlerStorage } from './resettable-throttler-storage';

/** Forgets every rate-limit counter of an app built by `createAuthTestApp`. */
export function resetRateLimits(app: NestExpressApplication): void {
  const storage: unknown = app.get(ThrottlerStorage, { strict: false });
  if (!(storage instanceof ResettableThrottlerStorage)) {
    throw new Error('The app was not built by createAuthTestApp (no resettable throttler storage)');
  }
  storage.reset();
}
