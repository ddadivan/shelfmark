import { DOCUMENT } from '@angular/common';
import { inject, type Provider } from '@angular/core';
import { MockExportApi } from '../../export/mock/mock-export.api';
import { EXPORT_API } from '../../export/models/export-api.const';
import { REAL_AUTH_API_STORAGE_KEY } from '../../../core/auth/models/real-auth-api-storage-key.const';
import { HttpUserSettingsApi } from '../../settings/http/http-user-settings.api';
import { MockUserSettingsApi } from '../../settings/mock/mock-user-settings.api';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../../settings/models/user-settings-api.interface';
import { HttpPinsApi } from '../../pins/http/http-pins.api';
import { MockPinsApi } from '../../pins/mock/mock-pins.api';
import { PINS_API } from '../../pins/models/pins-api.const';
import type { PinsApi } from '../../pins/models/pins-api.interface';
import { HttpTrashApi } from '../../trash/http/http-trash.api';
import { MockTrashApi } from '../../trash/mock/mock-trash.api';
import { TRASH_API } from '../../trash/models/trash-api.const';
import type { TrashApi } from '../../trash/models/trash-api.interface';
import { HttpFoldersApi } from '../http/http-folders.api';
import { HttpLinksApi } from '../http/http-links.api';
import { HttpTagsApi } from '../http/http-tags.api';
import { FOLDERS_API } from '../models/folders-api.const';
import type { FoldersApi } from '../models/folders-api.interface';
import { LINKS_API } from '../models/links-api.const';
import type { LinksApi } from '../models/links-api.interface';
import { TAGS_API } from '../models/tags-api.const';
import type { TagsApi } from '../models/tags-api.interface';
import { MockFoldersApi } from './mock-folders.api';
import { MockLinksApi } from './mock-links.api';
import { MockTagsApi } from './mock-tags.api';

/** True when `sm-real-auth-api` is set in `localStorage` (the same switch as `provide-auth-api.dev.ts`). */
function useRealApi(): boolean {
  const storage = inject(DOCUMENT).defaultView?.localStorage;
  return Boolean(storage?.getItem(REAL_AUTH_API_STORAGE_KEY));
}

/**
 * Replaces `provide-links-api.ts` in the `development` and `e2e` builds (`fileReplacements`):
 * the same seams backed by the contract mocks, or by the `Http*` APIs when `sm-real-auth-api`
 * is set. The production build never imports this file.
 */
export function provideLinksApi(): Provider[] {
  return [
    {
      provide: LINKS_API,
      useFactory: (): LinksApi => (useRealApi() ? inject(HttpLinksApi) : inject(MockLinksApi)),
    },
    {
      provide: FOLDERS_API,
      useFactory: (): FoldersApi =>
        useRealApi() ? inject(HttpFoldersApi) : inject(MockFoldersApi),
    },
    {
      provide: TAGS_API,
      useFactory: (): TagsApi => (useRealApi() ? inject(HttpTagsApi) : inject(MockTagsApi)),
    },
    {
      provide: TRASH_API,
      useFactory: (): TrashApi => (useRealApi() ? inject(HttpTrashApi) : inject(MockTrashApi)),
    },
    {
      provide: PINS_API,
      useFactory: (): PinsApi => (useRealApi() ? inject(HttpPinsApi) : inject(MockPinsApi)),
    },
    {
      provide: USER_SETTINGS_API,
      useFactory: (): UserSettingsApi =>
        useRealApi() ? inject(HttpUserSettingsApi) : inject(MockUserSettingsApi),
    },
    { provide: EXPORT_API, useExisting: MockExportApi },
  ];
}
