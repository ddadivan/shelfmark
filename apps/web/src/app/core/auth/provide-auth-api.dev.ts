import { SafeStorage } from '../storage/safe-storage.service';
import { STORAGE_KEY } from '../storage/models/storage-key.const';
import { inject, Provider } from '@angular/core';
import { AUTH_API } from './auth-api.token';
import { BetterAuthApi } from './better-auth-api';
import { MockAuthApi } from './mock-auth-api';
import { AuthApi } from './models/auth-api.interface';

/**
 * Development and e2e binding of `AUTH_API` (replaces `provide-auth-api.ts`): the in-browser
 * mock. Setting `sm-real-auth-api` in `localStorage` binds `BetterAuthApi` instead, so e2e can
 * exercise the real client against routed API responses.
 */
export function provideAuthApi(): Provider {
  return {
    provide: AUTH_API,
    useFactory: (): AuthApi => {
      return inject(SafeStorage).getString(STORAGE_KEY.RealAuthApi)
        ? inject(BetterAuthApi)
        : inject(MockAuthApi);
    },
  };
}
