import type { Provider } from '@angular/core';
import { HttpFeedbackApi } from './http/http-feedback.api';
import { FEEDBACK_API } from './models/feedback-api.const';

/**
 * Production binding of `FEEDBACK_API`. The `development` and `e2e` builds replace this file
 * with `mock/provide-feedback-api.e2e.ts` (`fileReplacements` in `project.json`), so the mock
 * never reaches a production bundle.
 */
export function provideFeedbackApi(): Provider {
  return { provide: FEEDBACK_API, useExisting: HttpFeedbackApi };
}
