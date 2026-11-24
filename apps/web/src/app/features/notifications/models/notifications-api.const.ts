import { InjectionToken } from '@angular/core';
import type { NotificationsApi } from './notifications-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const NOTIFICATIONS_API = new InjectionToken<NotificationsApi>('NOTIFICATIONS_API');
