import { DOCUMENT } from '@angular/common';
import { inject, Provider } from '@angular/core';
import { AUTH_API } from './auth-api.token';
import { BetterAuthApi } from './better-auth-api';
import { MockAuthApi } from './mock-auth-api';
import { AuthApi } from './models/auth-api.interface';
import { REAL_AUTH_API_STORAGE_KEY } from './models/real-auth-api-storage-key.const';

/**
 * Development and e2e binding of `AUTH_API` (replaces `provide-auth-api.ts`): the in-browser
 * mock. Setting `sm-real-auth-api` in `localStorage` binds `BetterAuthApi` instead, so e2e can
 * exercise the real client against routed API responses.
 */
export function provideAuthApi(): Provider {
  return {
    provide: AUTH_API,
    useFactory: (): AuthApi => {
      const storage = inject(DOCUMENT).defaultView?.localStorage;
      return storage?.getItem(REAL_AUTH_API_STORAGE_KEY)
        ? inject(BetterAuthApi)
        : inject(MockAuthApi);
    },
  };
}
