import type { Provider } from '@angular/core';
import { FEEDBACK_API } from '../models/feedback-api.const';
import { MockFeedbackApi } from './mock-feedback.api';

/** Replaces `provide-feedback-api.ts` in the `development` and `e2e` builds (`fileReplacements`). */
export function provideFeedbackApi(): Provider {
  return { provide: FEEDBACK_API, useExisting: MockFeedbackApi };
}
