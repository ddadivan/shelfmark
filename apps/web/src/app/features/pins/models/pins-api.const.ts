import { InjectionToken } from '@angular/core';
import type { PinsApi } from './pins-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const PINS_API = new InjectionToken<PinsApi>('PINS_API');
