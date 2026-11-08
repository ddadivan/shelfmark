import type { Provider } from '@angular/core';
import { HttpAccountDeletionApi } from './http/http-account-deletion.api';
import { ACCOUNT_DELETION_API } from './models/account-deletion-api.const';

/**
 * Production binding of `ACCOUNT_DELETION_API`. The `development` and `e2e` builds replace this
 * file with `mock/provide-account-deletion-api.e2e.ts` (`fileReplacements` in `project.json`),
 * so the mock never reaches a production bundle.
 */
export function provideAccountDeletionApi(): Provider {
  return { provide: ACCOUNT_DELETION_API, useExisting: HttpAccountDeletionApi };
}
