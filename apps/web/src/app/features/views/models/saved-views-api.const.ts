import { InjectionToken } from '@angular/core';
import type { SavedViewsApi } from './saved-views-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const SAVED_VIEWS_API = new InjectionToken<SavedViewsApi>('SAVED_VIEWS_API');
