import { InjectionToken } from '@angular/core';
import type { AccountDeletionApi } from './account-deletion-api.interface';

/** No default: `provideAccountDeletionApi()` registers the implementation, specs provide their own. */
export const ACCOUNT_DELETION_API = new InjectionToken<AccountDeletionApi>('ACCOUNT_DELETION_API');
