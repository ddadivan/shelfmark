import { InjectionToken } from '@angular/core';
import type { ReaderApi } from './reader-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const READER_API = new InjectionToken<ReaderApi>('READER_API');
