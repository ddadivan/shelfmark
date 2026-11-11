import type { Provider } from '@angular/core';
import { ADMIN_API } from '../models/admin-api.const';
import { MockAdminApi } from './mock-admin.api';

/** Replaces `provide-admin-api.ts` in the `development` and `e2e` builds (`fileReplacements`). */
export function provideAdminApi(): Provider {
  return { provide: ADMIN_API, useExisting: MockAdminApi };
}
