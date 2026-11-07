import { inject, InjectionToken } from '@angular/core';
import { MockTagsApi } from '../mock/mock-tags.api';
import type { TagsApi } from './tags-api.interface';

/** Default is the mock until the tags feature (#76) provides the real API. */
export const TAGS_API = new InjectionToken<TagsApi>('TAGS_API', {
  factory: () => inject(MockTagsApi),
});
