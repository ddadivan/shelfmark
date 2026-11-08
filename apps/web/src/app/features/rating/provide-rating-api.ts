import type { Provider } from '@angular/core';
import { HttpRatingApi } from './http/http-rating.api';
import { RATING_API } from './models/rating-api.const';

/**
 * Production binding of `RATING_API`. The `development` and `e2e` builds replace this file
 * with `mock/provide-rating-api.e2e.ts` (`fileReplacements` in `project.json`), so the mock
 * never reaches a production bundle.
 */
export function provideRatingApi(): Provider {
  return { provide: RATING_API, useExisting: HttpRatingApi };
}
