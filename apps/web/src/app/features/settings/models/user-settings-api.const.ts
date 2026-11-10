import { InjectionToken } from '@angular/core';
import type { UserSettingsApi } from './user-settings-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const USER_SETTINGS_API = new InjectionToken<UserSettingsApi>('USER_SETTINGS_API');
