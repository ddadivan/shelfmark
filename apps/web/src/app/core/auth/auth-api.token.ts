import { InjectionToken } from '@angular/core';
import { AuthApi } from './models/auth-api.interface';

/**
 * The authentication backend. It has no default: `app.config.ts` provides it through
 * `provideAuthApi()`, whose file is replaced per build (see `project.json`): production gets
 * `BetterAuthApi`, development and e2e get `MockAuthApi`.
 */
export const AUTH_API = new InjectionToken<AuthApi>('AUTH_API');
