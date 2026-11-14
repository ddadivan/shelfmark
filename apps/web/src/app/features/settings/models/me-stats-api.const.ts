import { InjectionToken } from '@angular/core';
import type { MeStatsApi } from './me-stats-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const ME_STATS_API = new InjectionToken<MeStatsApi>('ME_STATS_API');
