import type { Provider } from '@angular/core';
import { FOLDERS_API } from '../models/folders-api.const';
import { LINKS_API } from '../models/links-api.const';
import { TAGS_API } from '../models/tags-api.const';
import { MockFoldersApi } from './mock-folders.api';
import { MockLinksApi } from './mock-links.api';
import { MockTagsApi } from './mock-tags.api';

/**
 * Replaces `provide-links-api.ts` in the `development` and `e2e` builds (`fileReplacements`):
 * the same seams backed by the contract mocks. The production build never imports this file.
 */
export function provideLinksApi(): Provider[] {
  return [
    { provide: LINKS_API, useExisting: MockLinksApi },
    { provide: FOLDERS_API, useExisting: MockFoldersApi },
    { provide: TAGS_API, useExisting: MockTagsApi },
  ];
}
