import type { Provider } from '@angular/core';
import { RATING_API } from '../models/rating-api.const';
import { MockRatingApi } from './mock-rating.api';

/** Replaces `provide-rating-api.ts` in the `development` and `e2e` builds (`fileReplacements`). */
export function provideRatingApi(): Provider {
  return { provide: RATING_API, useExisting: MockRatingApi };
}
