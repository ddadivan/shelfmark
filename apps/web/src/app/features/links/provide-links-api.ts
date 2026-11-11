import type { Provider } from '@angular/core';
import { HttpExportApi } from '../export/http/http-export.api';
import { EXPORT_API } from '../export/models/export-api.const';
import { HttpFoldersApi } from './http/http-folders.api';
import { HttpLinksApi } from './http/http-links.api';
import { HttpTagsApi } from './http/http-tags.api';
import { FOLDERS_API } from './models/folders-api.const';
import { LINKS_API } from './models/links-api.const';
import { TAGS_API } from './models/tags-api.const';
import { HttpSharesApi } from '../sharing/http/http-shares.api';
import { SHARES_API } from '../sharing/models/shares-api.const';

/**
 * Registers the data seams of the links feature (`LINKS_API`, `FOLDERS_API`, `TAGS_API`),
 * `SHARES_API` and `EXPORT_API` over the REST API. `EXPORT_API` is registered here, not in `app.config.ts`,
 * because this file is the single seam `fileReplacements` swaps: the `development` and `e2e`
 * builds replace it with `mock/provide-links-api.e2e.ts`, which provides `MockExportApi`
 * instead, so no export code needs its own build switch.
 */
export function provideLinksApi(): Provider[] {
  return [
    { provide: LINKS_API, useExisting: HttpLinksApi },
    { provide: FOLDERS_API, useExisting: HttpFoldersApi },
    { provide: TAGS_API, useExisting: HttpTagsApi },
    { provide: EXPORT_API, useExisting: HttpExportApi },
    { provide: SHARES_API, useExisting: HttpSharesApi },
  ];
}
