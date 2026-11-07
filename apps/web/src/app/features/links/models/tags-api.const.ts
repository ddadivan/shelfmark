import { InjectionToken } from '@angular/core';
import type { TagsApi } from './tags-api.interface';

/** No default: `provideLinksApi()` registers the implementation, specs provide their own. */
export const TAGS_API = new InjectionToken<TagsApi>('TAGS_API');
