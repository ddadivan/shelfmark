import { InjectionToken, inject } from '@angular/core';
import { MockAuthApi } from './mock-auth-api';
import { AuthApi } from './models/auth-api.interface';

/**
 * The authentication backend. This is the seam for #64: replace the factory with the Better Auth
 * client (or provide the token in `app.config.ts`); `AuthStore`, guards and pages stay as they are.
 */
export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API', {
  providedIn: 'root',
  factory: () => inject(MockAuthApi),
});
