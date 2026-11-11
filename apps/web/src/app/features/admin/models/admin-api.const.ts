import { InjectionToken } from '@angular/core';
import type { AdminApi } from './admin-api.interface';

/** No default: `provideAdminApi()` registers the implementation, specs provide their own. */
export const ADMIN_API = new InjectionToken<AdminApi>('ADMIN_API');
