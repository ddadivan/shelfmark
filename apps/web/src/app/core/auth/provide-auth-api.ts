import { Provider } from '@angular/core';
import { AUTH_API } from './auth-api.token';
import { UnavailableAuthApi } from './unavailable-auth-api';

/**
 * Production binding of `AUTH_API`. The development and e2e builds replace this file with
 * `provide-auth-api.dev.ts` (file replacement in `project.json`), so the mock never reaches
 * a production bundle. #64: bind the Better Auth client here.
 */
export function provideAuthApi(): Provider {
  return { provide: AUTH_API, useClass: UnavailableAuthApi };
}
