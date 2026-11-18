import { InjectionToken } from '@angular/core';
import type { CleanupApi } from './cleanup-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const CLEANUP_API = new InjectionToken<CleanupApi>('CLEANUP_API');
