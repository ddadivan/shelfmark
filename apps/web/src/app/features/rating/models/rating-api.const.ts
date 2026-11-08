import { InjectionToken } from '@angular/core';
import type { RatingApi } from './rating-api.interface';

/** No default: `provideRatingApi()` registers the implementation, specs provide their own. */
export const RATING_API = new InjectionToken<RatingApi>('RATING_API');
