import type { Type } from '@nestjs/common';
import type { ProviderOverride } from './provider-override.interface';

import type { RateLimitPreset } from '../../src/common/rate-limit/models/rate-limit-preset.interface';

export interface AuthTestAppOptions {
  /** Environment overrides applied until `close()` (`undefined` unsets). */
  env?: Record<string, string | undefined>;
  /** Passed to `configureApp` (helmet). Default: false. */
  isProduction?: boolean;
  /** Default per-IP limit of every route. Default: effectively unlimited. */
  defaultRateLimit?: RateLimitPreset;
  /** Auth-route limit. Default: effectively unlimited, so sign-in-heavy specs do not trip it. */
  authRateLimit?: RateLimitPreset;
  /** Register Google and GitHub with random per-run client credentials. Default: true. */
  providers?: boolean;
  /** Extra modules next to `AppModule` (test fixtures such as the isolation notes). */
  imports?: readonly Type<unknown>[];
  /** Providers replaced with test doubles (for example the page fetcher of the link preview). */
  overrides?: readonly ProviderOverride[];
}
