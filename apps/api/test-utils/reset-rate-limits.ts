import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerStorage } from '@nestjs/throttler';

function clearMap(owner: object, property: string): void {
  const value: unknown = Reflect.get(owner, property);
  if (!(value instanceof Map)) {
    throw new Error(`The throttler storage has no in-memory "${property}"`);
  }
  value.clear();
}

/**
 * Forgets every rate-limit counter of the test app. Per-route presets (`RATE_LIMIT.AddLink`,
 * `Preview`) are fixed by the route decorators, so a spec that sends many requests to such a route
 * calls this between tests instead of tripping the limit by accident. The in-memory storage keeps
 * its sliding window in a second private map, which has to be cleared as well.
 */
export function resetRateLimits(app: NestExpressApplication): void {
  const storage: unknown = app.get(ThrottlerStorage, { strict: false });
  if (typeof storage !== 'object' || storage === null) {
    throw new Error('The throttler storage is not available');
  }
  clearMap(storage, 'storage');
  clearMap(storage, 'hitExpirations');
}
