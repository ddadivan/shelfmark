import { InjectionToken } from '@angular/core';
import type { LinksApi } from './links-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const LINKS_API = new InjectionToken<LinksApi>('LINKS_API');
