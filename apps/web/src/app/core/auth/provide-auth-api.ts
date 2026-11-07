import { Provider } from '@angular/core';
import { AUTH_API } from './auth-api.token';
import { BetterAuthApi } from './better-auth-api';

/**
 * Production binding of `AUTH_API`: the Better Auth API. The development and e2e builds replace
 * this file with `provide-auth-api.dev.ts` (file replacement in `project.json`), so the mock
 * never reaches a production bundle.
 */
export function provideAuthApi(): Provider {
  return { provide: AUTH_API, useClass: BetterAuthApi };
}
