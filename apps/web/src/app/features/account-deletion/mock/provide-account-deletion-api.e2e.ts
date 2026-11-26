import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { inject, type Provider } from '@angular/core';
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
      return inject(SafeStorage).getString(STORAGE_KEY.RealAuthApi)
        ? inject(HttpAccountDeletionApi)
        : inject(MockAccountDeletionApi);
    },
  };
}
