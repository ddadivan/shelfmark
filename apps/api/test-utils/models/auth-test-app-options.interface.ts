import type { Type } from '@nestjs/common';

export interface AuthTestAppOptions {
  /** Environment overrides applied until `close()` (`undefined` unsets). */
  env?: Record<string, string | undefined>;
  /** Passed to `configureApp` (helmet). Default: false. */
  isProduction?: boolean;
  /** Register Google and GitHub with random per-run client credentials. Default: true. */
  providers?: boolean;
  /** Extra modules next to `AppModule` (test fixtures such as the isolation notes). */
  imports?: readonly Type<unknown>[];
}
