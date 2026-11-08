import type { RateLimitPreset } from '../common/rate-limit/models/rate-limit-preset.interface';

export interface ConfigureAppOptions {
  /** Production gets strict helmet defaults; development drops HSTS and HTTPS upgrade. */
  isProduction: boolean;
  /** Per-IP limit on the auth routes. Default `RATE_LIMIT.Auth`; test harnesses raise it. */
  authRateLimit?: RateLimitPreset;
}
