import { Throttle } from '@nestjs/throttler';
import { perRouteKey } from './rate-limit-key';
import type { RateLimitPreset } from './models/rate-limit-preset.interface';

/** Stricter limit for one route or controller, replacing the default (`RATE_LIMIT.*`). */
export function RateLimit(preset: RateLimitPreset): MethodDecorator & ClassDecorator {
  return Throttle({
    default: { limit: preset.limit, ttl: preset.ttl, generateKey: perRouteKey },
  });
}
