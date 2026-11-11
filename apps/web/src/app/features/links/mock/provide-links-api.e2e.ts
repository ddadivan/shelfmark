import { DOCUMENT } from '@angular/common';
import { inject, type Provider } from '@angular/core';
import { MockExportApi } from '../../export/mock/mock-export.api';
import { EXPORT_API } from '../../export/models/export-api.const';
import { REAL_AUTH_API_STORAGE_KEY } from '../../../core/auth/models/real-auth-api-storage-key.const';
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
import { HttpSharesApi } from '../../sharing/http/http-shares.api';
import { MockSharesApi } from '../../sharing/mock/mock-shares.api';
import { SHARES_API } from '../../sharing/models/shares-api.const';
import type { SharesApi } from '../../sharing/models/shares-api.interface';

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
      provide: SHARES_API,
      useFactory: (): SharesApi => (useRealApi() ? inject(HttpSharesApi) : inject(MockSharesApi)),
    },
    { provide: EXPORT_API, useExisting: MockExportApi },
  ];
}
