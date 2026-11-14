import { InjectionToken } from '@angular/core';
import type { SharesApi } from './shares-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const SHARES_API = new InjectionToken<SharesApi>('SHARES_API');
