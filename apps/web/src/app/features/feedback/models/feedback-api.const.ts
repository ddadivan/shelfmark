import { InjectionToken } from '@angular/core';
import type { FeedbackApi } from './feedback-api.interface';

/** No default: `provideFeedbackApi()` registers the implementation, specs provide their own. */
export const FEEDBACK_API = new InjectionToken<FeedbackApi>('FEEDBACK_API');
