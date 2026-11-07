import type { Provider } from '@angular/core';
import { FOLDERS_API } from './models/folders-api.const';
import { LINKS_API } from './models/links-api.const';
import { TAGS_API } from './models/tags-api.const';
import { MockFoldersApi } from './mock/mock-folders.api';
import { MockLinksApi } from './mock/mock-links.api';
import { MockTagsApi } from './mock/mock-tags.api';

/**
 * Registers the data seams of the links feature (`LINKS_API`, `FOLDERS_API`, `TAGS_API`) with the
 * contract mocks. The tokens already default to these mocks; when #72 / #75 / #76 land, this is
 * the one place that switches to the HTTP implementations.
 */
export function provideLinksApi(): Provider[] {
  return [
    { provide: LINKS_API, useExisting: MockLinksApi },
    { provide: FOLDERS_API, useExisting: MockFoldersApi },
    { provide: TAGS_API, useExisting: MockTagsApi },
  ];
}
