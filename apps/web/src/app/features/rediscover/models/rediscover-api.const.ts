import { InjectionToken } from '@angular/core';
import type { RediscoverApi } from './rediscover-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const REDISCOVER_API = new InjectionToken<RediscoverApi>('REDISCOVER_API');
