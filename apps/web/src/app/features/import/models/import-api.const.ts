import { InjectionToken } from '@angular/core';
import type { ImportApi } from './import-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const IMPORT_API = new InjectionToken<ImportApi>('IMPORT_API');
