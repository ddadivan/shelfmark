import { Provider } from '@angular/core';
import { AUTH_API } from './auth-api.token';
import { MockAuthApi } from './mock-auth-api';

/** Development and e2e binding of `AUTH_API`: the in-browser mock (replaces `provide-auth-api.ts`). */
export function provideAuthApi(): Provider {
  return { provide: AUTH_API, useClass: MockAuthApi };
}
