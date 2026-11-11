import { inject, type Provider } from '@angular/core';
import {
  tabSyncedFoldersApi,
  tabSyncedLinksApi,
  tabSyncedTagsApi,
  tabSyncedPinsApi,
  tabSyncedTrashApi,
} from '../../core/sync/tab-synced-apis';
import { TabSyncService } from '../../core/sync/tab-sync.service';
import { HttpExportApi } from '../export/http/http-export.api';
import { EXPORT_API } from '../export/models/export-api.const';
import { HttpUserSettingsApi } from '../settings/http/http-user-settings.api';
import { USER_SETTINGS_API } from '../settings/models/user-settings-api.const';
import { HttpPinsApi } from '../pins/http/http-pins.api';
import { PINS_API } from '../pins/models/pins-api.const';
import { HttpTrashApi } from '../trash/http/http-trash.api';
import { TRASH_API } from '../trash/models/trash-api.const';
import { HttpSavedViewsApi } from '../views/http/http-saved-views.api';
import { SAVED_VIEWS_API } from '../views/models/saved-views-api.const';
import { HttpFoldersApi } from './http/http-folders.api';
import { HttpLinksApi } from './http/http-links.api';
import { HttpTagsApi } from './http/http-tags.api';
import { FOLDERS_API } from './models/folders-api.const';
import { LINKS_API } from './models/links-api.const';
import { TAGS_API } from './models/tags-api.const';

/**
 * Registers the data seams of the links feature (`LINKS_API`, `FOLDERS_API`, `TAGS_API`) and
 * `EXPORT_API`, `TRASH_API`, `USER_SETTINGS_API` and `SAVED_VIEWS_API` over the REST API. `EXPORT_API` is registered here, not in `app.config.ts`,
 * because this file is the single seam `fileReplacements` swaps: the `development` and `e2e`
 * builds replace it with `mock/provide-links-api.e2e.ts`, which provides `MockExportApi`
 * instead, so no export code needs its own build switch.
 */
export function provideLinksApi(): Provider[] {
  return [
    // Writes are also posted to the other tabs (tab sync, #268).
    {
      provide: LINKS_API,
      useFactory: () => tabSyncedLinksApi(inject(HttpLinksApi), inject(TabSyncService)),
    },
    {
      provide: FOLDERS_API,
      useFactory: () => tabSyncedFoldersApi(inject(HttpFoldersApi), inject(TabSyncService)),
    },
    {
      provide: TAGS_API,
      useFactory: () => tabSyncedTagsApi(inject(HttpTagsApi), inject(TabSyncService)),
    },
    { provide: EXPORT_API, useExisting: HttpExportApi },
    {
      provide: PINS_API,
      useFactory: () => tabSyncedPinsApi(inject(HttpPinsApi), inject(TabSyncService)),
    },
    {
      provide: TRASH_API,
      useFactory: () => tabSyncedTrashApi(inject(HttpTrashApi), inject(TabSyncService)),
    },
    { provide: USER_SETTINGS_API, useExisting: HttpUserSettingsApi },
    { provide: SAVED_VIEWS_API, useExisting: HttpSavedViewsApi },
  ];
}
