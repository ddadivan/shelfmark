import { InjectionToken } from '@angular/core';
import type { FoldersApi } from './folders-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const FOLDERS_API = new InjectionToken<FoldersApi>('FOLDERS_API');
