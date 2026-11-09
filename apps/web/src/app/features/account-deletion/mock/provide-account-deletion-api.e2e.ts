import { DOCUMENT } from '@angular/common';
import { inject, type Provider } from '@angular/core';
import { REAL_AUTH_API_STORAGE_KEY } from '../../../core/auth/models/real-auth-api-storage-key.const';
import { HttpAccountDeletionApi } from '../http/http-account-deletion.api';
import { ACCOUNT_DELETION_API } from '../models/account-deletion-api.const';
import type { AccountDeletionApi } from '../models/account-deletion-api.interface';
import { MockAccountDeletionApi } from './mock-account-deletion.api';

/**
 * Replaces `provide-account-deletion-api.ts` in the `development` and `e2e` builds
 * (`fileReplacements`): the mock, or the real API when `sm-real-auth-api` is set.
 */
export function provideAccountDeletionApi(): Provider {
  return {
    provide: ACCOUNT_DELETION_API,
    useFactory: (): AccountDeletionApi => {
      const storage = inject(DOCUMENT).defaultView?.localStorage;
      return storage?.getItem(REAL_AUTH_API_STORAGE_KEY)
        ? inject(HttpAccountDeletionApi)
        : inject(MockAccountDeletionApi);
    },
  };
}
