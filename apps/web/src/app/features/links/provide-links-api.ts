import type { Provider } from '@angular/core';
import { FOLDERS_API } from './models/folders-api.const';
import { LINKS_API } from './models/links-api.const';
import { TAGS_API } from './models/tags-api.const';
import { UnavailableFoldersApi } from './unavailable/unavailable-folders.api';
import { UnavailableLinksApi } from './unavailable/unavailable-links.api';
import { UnavailableTagsApi } from './unavailable/unavailable-tags.api';

/**
 * Registers the data seams of the links feature (`LINKS_API`, `FOLDERS_API`, `TAGS_API`).
 * Until #72 / #75 / #76 land these are placeholders that reject with a clear error, so no
 * fixtures ship in production. The `development` and `e2e` builds replace this file with
 * `mock/provide-links-api.e2e.ts` (`fileReplacements` in `project.json`).
 */
export function provideLinksApi(): Provider[] {
  return [
    { provide: LINKS_API, useExisting: UnavailableLinksApi },
    { provide: FOLDERS_API, useExisting: UnavailableFoldersApi },
    { provide: TAGS_API, useExisting: UnavailableTagsApi },
  ];
}
