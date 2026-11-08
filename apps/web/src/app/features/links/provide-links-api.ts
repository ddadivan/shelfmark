import type { Provider } from '@angular/core';
import { HttpExportApi } from '../export/http/http-export.api';
import { EXPORT_API } from '../export/models/export-api.const';
import { FOLDERS_API } from './models/folders-api.const';
import { LINKS_API } from './models/links-api.const';
import { TAGS_API } from './models/tags-api.const';
import { UnavailableFoldersApi } from './unavailable/unavailable-folders.api';
import { UnavailableLinksApi } from './unavailable/unavailable-links.api';
import { UnavailableTagsApi } from './unavailable/unavailable-tags.api';

/**
 * Registers the data seams of the links feature (`LINKS_API`, `FOLDERS_API`, `TAGS_API`).
 * Until #72 / #75 / #76 land these are placeholders that reject with a clear error, so no
 * fixtures ship in production. `EXPORT_API` is the real one: it only fetches a file, and a 404
 * (API not deployed yet) or 401 becomes an error toast. It is registered here, not in
 * `app.config.ts`, because this file is the single seam `fileReplacements` swaps: the
 * `development` and `e2e` builds replace it with `mock/provide-links-api.e2e.ts`, which
 * provides `MockExportApi` instead, so no export code needs its own build switch.
 */
export function provideLinksApi(): Provider[] {
  return [
    { provide: LINKS_API, useExisting: UnavailableLinksApi },
    { provide: FOLDERS_API, useExisting: UnavailableFoldersApi },
    { provide: EXPORT_API, useExisting: HttpExportApi },
    { provide: TAGS_API, useExisting: UnavailableTagsApi },
  ];
}
