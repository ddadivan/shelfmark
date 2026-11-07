import type { Provider } from '@angular/core';
import { HttpFoldersApi } from './http/http-folders.api';
import { HttpLinksApi } from './http/http-links.api';
import { HttpTagsApi } from './http/http-tags.api';
import { FOLDERS_API } from './models/folders-api.const';
import { LINKS_API } from './models/links-api.const';
import { TAGS_API } from './models/tags-api.const';

/**
 * Registers the data seams of the links feature (`LINKS_API`, `FOLDERS_API`, `TAGS_API`) over
 * the REST API. The `development` and `e2e` builds replace this file with
 * `mock/provide-links-api.e2e.ts` (`fileReplacements` in `project.json`).
 */
export function provideLinksApi(): Provider[] {
  return [
    { provide: LINKS_API, useExisting: HttpLinksApi },
    { provide: FOLDERS_API, useExisting: HttpFoldersApi },
    { provide: TAGS_API, useExisting: HttpTagsApi },
  ];
}
