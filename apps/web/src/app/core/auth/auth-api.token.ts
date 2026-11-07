import { InjectionToken } from '@angular/core';
import { AuthApi } from './models/auth-api.interface';

/**
 * The authentication backend. It has no default: `app.config.ts` provides it through
 * `provideAuthApi()`, whose file is replaced per build (see `project.json`): production gets the
 * always-signed-out `UnavailableAuthApi`, development and e2e get `MockAuthApi`. #64 puts the
 * Better Auth client into `provide-auth-api.ts`.
 */
export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');
