import { DEFAULT_THROTTLER_NAME } from '../common/rate-limit/models/default-throttler-name.const';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import type { RateLimitPreset } from '../common/rate-limit/models/rate-limit-preset.interface';
import { CleanupController } from './cleanup.controller';

/** Metadata keys of `@nestjs/throttler`'s `@Throttle` (not exported from the package root). */
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

/** The stricter per-route limits of the clean-up routes (ADR 0031); reads stay on the default. */
describe('CleanupController rate limits', () => {
  const limitOf = (method: keyof CleanupController): RateLimitPreset | undefined => {
    const handler: unknown = CleanupController.prototype[method];
    if (typeof handler !== 'function') throw new Error(`no handler ${method}`);
    const limit: unknown = Reflect.getMetadata(THROTTLER_LIMIT + DEFAULT_THROTTLER_NAME, handler);
    const ttl: unknown = Reflect.getMetadata(THROTTLER_TTL + DEFAULT_THROTTLER_NAME, handler);
    return typeof limit === 'number' && typeof ttl === 'number' ? { limit, ttl } : undefined;
  };

  it.each([
    ['run', RATE_LIMIT.CleanupRun],
    ['dismissCard', RATE_LIMIT.CleanupRun],
    ['apply', RATE_LIMIT.CleanupApply],
    ['undo', RATE_LIMIT.CleanupApply],
  ] as const)('limits %s', (method, preset) => {
    expect(limitOf(method)).toEqual({ limit: preset.limit, ttl: preset.ttl });
  });

  it.each(['report', 'summary'] as const)('leaves %s on the default limit', (method) => {
    expect(limitOf(method)).toBeUndefined();
  });
});
