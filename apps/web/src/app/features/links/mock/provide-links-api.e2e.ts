import { DOCUMENT } from '@angular/common';
import { inject, type Provider } from '@angular/core';
import { MockExportApi } from '../../export/mock/mock-export.api';
import { EXPORT_API } from '../../export/models/export-api.const';
import { REAL_AUTH_API_STORAGE_KEY } from '../../../core/auth/models/real-auth-api-storage-key.const';
import { HttpUserSettingsApi } from '../../settings/http/http-user-settings.api';
import { MockUserSettingsApi } from '../../settings/mock/mock-user-settings.api';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../../settings/models/user-settings-api.interface';
import { HttpMeStatsApi } from '../../settings/http/http-me-stats.api';
import { MockMeStatsApi } from '../../settings/mock/mock-me-stats.api';
import { ME_STATS_API } from '../../settings/models/me-stats-api.const';
import type { MeStatsApi } from '../../settings/models/me-stats-api.interface';
import { HttpPinsApi } from '../../pins/http/http-pins.api';
import { MockPinsApi } from '../../pins/mock/mock-pins.api';
import { PINS_API } from '../../pins/models/pins-api.const';
import type { PinsApi } from '../../pins/models/pins-api.interface';
import { HttpRemindersApi } from '../../reminders/http/http-reminders.api';
import { MockRemindersApi } from '../../reminders/mock/mock-reminders.api';
import { REMINDERS_API } from '../../reminders/models/reminders-api.const';
import type { RemindersApi } from '../../reminders/models/reminders-api.interface';
import { HttpTrashApi } from '../../trash/http/http-trash.api';
import { MockTrashApi } from '../../trash/mock/mock-trash.api';
import { TRASH_API } from '../../trash/models/trash-api.const';
import type { TrashApi } from '../../trash/models/trash-api.interface';
import { HttpSavedViewsApi } from '../../views/http/http-saved-views.api';
import { MockSavedViewsApi } from '../../views/mock/mock-saved-views.api';
import { SAVED_VIEWS_API } from '../../views/models/saved-views-api.const';
import type { SavedViewsApi } from '../../views/models/saved-views-api.interface';
import { HttpRulesApi } from '../../rules/http/http-rules.api';
import { MockRulesApi } from '../../rules/mock/mock-rules.api';
import { RULES_API } from '../../rules/models/rules-api.const';
import type { RulesApi } from '../../rules/models/rules-api.interface';
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
import { HttpAiApi } from '../../ai/http/http-ai.api';
import { MockAiApi } from '../../ai/mock/mock-ai.api';
import { AI_API } from '../../ai/models/ai-api.const';
import { HttpRediscoverApi } from '../../rediscover/http/http-rediscover.api';
import { MockRediscoverApi } from '../../rediscover/mock/mock-rediscover.api';
import { REDISCOVER_API } from '../../rediscover/models/rediscover-api.const';
import type { RediscoverApi } from '../../rediscover/models/rediscover-api.interface';
import { HttpReaderApi } from '../../reader/http/http-reader.api';
import { MockReaderApi } from '../../reader/mock/mock-reader.api';
import { READER_API } from '../../reader/models/reader-api.const';
import { HttpNotificationsApi } from '../../notifications/http/http-notifications.api';
import { MockNotificationsApi } from '../../notifications/mock/mock-notifications.api';
import { NOTIFICATIONS_API } from '../../notifications/models/notifications-api.const';
import type { NotificationsApi } from '../../notifications/models/notifications-api.interface';
import type { ReaderApi } from '../../reader/models/reader-api.interface';
import { HttpCleanupApi } from '../../cleanup/http/http-cleanup.api';
import { MockCleanupApi } from '../../cleanup/mock/mock-cleanup.api';
import { CLEANUP_API } from '../../cleanup/models/cleanup-api.const';
import type { CleanupApi } from '../../cleanup/models/cleanup-api.interface';
import { HttpImportApi } from '../../import/http/http-import.api';
import { MockImportApi } from '../../import/mock/mock-import.api';
import { IMPORT_API } from '../../import/models/import-api.const';
import type { ImportApi } from '../../import/models/import-api.interface';
import type { AiApi } from '../../ai/models/ai-api.interface';
import { HttpMcpApi } from '../../ai/connect/http/http-mcp.api';
import { MockMcpApi } from '../../ai/connect/mock/mock-mcp.api';
import { MCP_API } from '../../ai/connect/models/mcp-api.const';
import type { McpApi } from '../../ai/connect/models/mcp-api.interface';
import { HttpSharesApi } from '../../sharing/http/http-shares.api';
import { MockSharesApi } from '../../sharing/mock/mock-shares.api';
import { PUBLIC_COLLECTION_ORIGIN } from '../../sharing/models/public-collection-origin.const';
import { SHARES_API } from '../../sharing/models/shares-api.const';
import type { SharesApi } from '../../sharing/models/shares-api.interface';
import {
  tabSyncedFoldersApi,
  tabSyncedLinksApi,
  tabSyncedTagsApi,
  tabSyncedPinsApi,
  tabSyncedRemindersApi,
  tabSyncedTrashApi,
} from '../../../core/sync/tab-synced-apis';
import { TabSyncService } from '../../../core/sync/tab-sync.service';

/** True when `sm-real-auth-api` is set in `localStorage` (the same switch as `provide-auth-api.dev.ts`). */
function useRealApi(): boolean {
  const storage = inject(DOCUMENT).defaultView?.localStorage;
  return Boolean(storage?.getItem(REAL_AUTH_API_STORAGE_KEY));
}

/**
 * Replaces `provide-links-api.ts` in the `development` and `e2e` builds (`fileReplacements`):
 * the same seams backed by the contract mocks, or by the `Http*` APIs when `sm-real-auth-api`
 * is set, wrapped for tab sync like the production seams. The production build never imports this file.
 */
export function provideLinksApi(): Provider[] {
  return [
    {
      provide: LINKS_API,
      useFactory: (): LinksApi =>
        tabSyncedLinksApi(
          useRealApi() ? inject(HttpLinksApi) : inject(MockLinksApi),
          inject(TabSyncService),
        ),
    },
    {
      provide: FOLDERS_API,
      useFactory: (): FoldersApi =>
        tabSyncedFoldersApi(
          useRealApi() ? inject(HttpFoldersApi) : inject(MockFoldersApi),
          inject(TabSyncService),
        ),
    },
    {
      provide: TAGS_API,
      useFactory: (): TagsApi =>
        tabSyncedTagsApi(
          useRealApi() ? inject(HttpTagsApi) : inject(MockTagsApi),
          inject(TabSyncService),
        ),
    },
    {
      provide: SHARES_API,
      useFactory: (): SharesApi => (useRealApi() ? inject(HttpSharesApi) : inject(MockSharesApi)),
    },
    {
      provide: PUBLIC_COLLECTION_ORIGIN,
      useFactory: (): string =>
        useRealApi()
          ? (inject(DOCUMENT).location?.origin ?? '')
          : inject(MockSharesApi).publicOrigin(),
    },
    {
      provide: TRASH_API,
      useFactory: (): TrashApi =>
        tabSyncedTrashApi(
          useRealApi() ? inject(HttpTrashApi) : inject(MockTrashApi),
          inject(TabSyncService),
        ),
    },
    {
      provide: PINS_API,
      useFactory: (): PinsApi =>
        tabSyncedPinsApi(
          useRealApi() ? inject(HttpPinsApi) : inject(MockPinsApi),
          inject(TabSyncService),
        ),
    },
    {
      provide: REMINDERS_API,
      useFactory: (): RemindersApi =>
        tabSyncedRemindersApi(
          useRealApi() ? inject(HttpRemindersApi) : inject(MockRemindersApi),
          inject(TabSyncService),
        ),
    },
    {
      provide: USER_SETTINGS_API,
      useFactory: (): UserSettingsApi =>
        useRealApi() ? inject(HttpUserSettingsApi) : inject(MockUserSettingsApi),
    },
    {
      provide: ME_STATS_API,
      useFactory: (): MeStatsApi =>
        useRealApi() ? inject(HttpMeStatsApi) : inject(MockMeStatsApi),
    },
    {
      provide: SAVED_VIEWS_API,
      useFactory: (): SavedViewsApi =>
        useRealApi() ? inject(HttpSavedViewsApi) : inject(MockSavedViewsApi),
    },
    {
      provide: RULES_API,
      useFactory: (): RulesApi => (useRealApi() ? inject(HttpRulesApi) : inject(MockRulesApi)),
    },
    {
      provide: AI_API,
      useFactory: (): AiApi => (useRealApi() ? inject(HttpAiApi) : inject(MockAiApi)),
    },
    {
      provide: MCP_API,
      useFactory: (): McpApi => (useRealApi() ? inject(HttpMcpApi) : inject(MockMcpApi)),
    },
    {
      provide: REDISCOVER_API,
      useFactory: (): RediscoverApi =>
        useRealApi() ? inject(HttpRediscoverApi) : inject(MockRediscoverApi),
    },
    {
      provide: CLEANUP_API,
      useFactory: (): CleanupApi =>
        useRealApi() ? inject(HttpCleanupApi) : inject(MockCleanupApi),
    },
    {
      provide: IMPORT_API,
      useFactory: (): ImportApi => (useRealApi() ? inject(HttpImportApi) : inject(MockImportApi)),
    },
    {
      provide: READER_API,
      useFactory: (): ReaderApi => (useRealApi() ? inject(HttpReaderApi) : inject(MockReaderApi)),
    },
    { provide: EXPORT_API, useExisting: MockExportApi },
    {
      provide: NOTIFICATIONS_API,
      useFactory: (): NotificationsApi =>
        useRealApi() ? inject(HttpNotificationsApi) : inject(MockNotificationsApi),
    },
  ];
}
