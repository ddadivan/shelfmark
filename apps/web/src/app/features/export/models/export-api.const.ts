import { InjectionToken } from '@angular/core';
import type { ExportApi } from './export-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const EXPORT_API = new InjectionToken<ExportApi>('EXPORT_API');
