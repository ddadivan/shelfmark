import type { Provider } from '@angular/core';
import { HttpAdminApi } from './http/http-admin.api';
import { ADMIN_API } from './models/admin-api.const';

/**
 * Production binding of `ADMIN_API`. The `development` and `e2e` builds replace this file with
 * `mock/provide-admin-api.e2e.ts` (`fileReplacements` in `project.json`), so the mock never
 * reaches a production bundle.
 */
export function provideAdminApi(): Provider {
  return { provide: ADMIN_API, useExisting: HttpAdminApi };
}
