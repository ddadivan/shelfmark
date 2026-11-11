import { InjectionToken } from '@angular/core';
import type { TrashApi } from './trash-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const TRASH_API = new InjectionToken<TrashApi>('TRASH_API');
