import { InjectionToken } from '@angular/core';
import type { RemindersApi } from './reminders-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const REMINDERS_API = new InjectionToken<RemindersApi>('REMINDERS_API');
