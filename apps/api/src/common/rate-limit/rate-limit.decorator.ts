import { Throttle } from '@nestjs/throttler';
import { DEFAULT_THROTTLER_NAME } from './models/default-throttler-name.const';
import type { RateLimitPreset } from './models/rate-limit-preset.interface';
import { perRouteKey } from './rate-limit-key';

/** Stricter limit for one route or controller, replacing the default (`RATE_LIMIT.*`). */
export function RateLimit(preset: RateLimitPreset): MethodDecorator & ClassDecorator {
  return Throttle({
    [DEFAULT_THROTTLER_NAME]: { limit: preset.limit, ttl: preset.ttl, generateKey: perRouteKey },
  });
}
