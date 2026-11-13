import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  FEEDBACK_ENDPOINT,
  feedbackScreenshotsPath,
  LINKS_BATCH_ENDPOINT,
  LINKS_BATCH_UPDATE_ENDPOINT,
  PIN_ENDPOINT,
  RECENT_LINKS_ENDPOINT,
  SAVED_VIEW_ENDPOINT,
  TRASH_ENDPOINT,
  USER_SETTINGS_ENDPOINT,
  ME_STATS_ENDPOINT,
  type MeStatsResponse,
  type CreateFolderRequest,
  type CreateLinkRequest,
  type CreateLinksBatchRequest,
  type CreateLinksBatchResponse,
  type CreateSavedViewRequest,
  type CreateTagRequest,
  type DeleteLinksBatchResponse,
  type ExportQuery,
  type FeedbackMessage,
  type FeedbackScreenshotUpload,
  type FolderResponse,
  type FolderShareResponse,
  type GetLinkResponse,
  type LinkResponse,
  type ListFeedbackMessagesResponse,
  type ListFoldersResponse,
  type ListLinksQuery,
  type ListLinksResponse,
  type ListPinsResponse,
  type ListSavedViewsQuery,
  type ListSavedViewsResponse,
  type ListTagsResponse,
  type ListTrashResponse,
  type MergeTagResponse,
  type OpenLinkResponse,
  type PublicCollectionQuery,
  type PublicCollectionResponse,
  type RecentLinksQuery,
  type RecentLinksResponse,
  type ReorderFoldersRequest,
  type SavedViewResponse,
  type SendFeedbackRequest,
  type TagResponse,
  type TrashActionResponse,
  type TrashItemRef,
  type UpdateFolderRequest,
  type UpdateLinkRequest,
  type UpdateLinksBatchRequest,
  type UpdateLinksBatchResponse,
  type UpdateSavedViewRequest,
  type UpdateTagRequest,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import type { ContractApis } from '@shelfmark/contract-tests';
import { ContractHttp, queryString } from './contract-http';

const enc = encodeURIComponent;

/**
 * Runner B: `ContractApis` over the real Nest app (`createAuthTestApp`) as the signed-in user
 * with `cookie`. Paths and bodies are the ones the web's `Http*Api` classes send.
 */
export function createHttpContractApis(app: NestExpressApplication, cookie: string): ContractApis {
  const http = new ContractHttp(app, cookie);
  return {
    links: {
      create: (request: CreateLinkRequest) =>
        http.send<LinkResponse>('post', '/api/links', request),
      list: (query: ListLinksQuery = {}) =>
        http.send<ListLinksResponse>('get', `/api/links${queryString({ ...query })}`),
      recent: (query: RecentLinksQuery = {}) =>
        http.send<RecentLinksResponse>('get', `/api/links/recent${queryString({ ...query })}`),
      removeRecent: (id) =>
        http.send<void>('delete', RECENT_LINKS_ENDPOINT.Remove.replace(':id', enc(id))),
      clearRecent: () => http.send<void>('delete', RECENT_LINKS_ENDPOINT.Clear),
      get: (id) => http.send<GetLinkResponse>('get', `/api/links/${enc(id)}`),
      update: (id, request: UpdateLinkRequest) =>
        http.send<LinkResponse>('patch', `/api/links/${enc(id)}`, request),
      remove: (id) => http.send<void>('delete', `/api/links/${enc(id)}`),
      open: (id) => http.send<OpenLinkResponse>('post', `/api/links/${enc(id)}/open`, {}),
      createBatch: (request: CreateLinksBatchRequest) =>
        http.send<CreateLinksBatchResponse>('post', LINKS_BATCH_ENDPOINT.Create, request),
      removeBatch: (ids) =>
        http.send<DeleteLinksBatchResponse>('post', LINKS_BATCH_ENDPOINT.Delete, { ids: [...ids] }),
      updateBatch: (request: UpdateLinksBatchRequest) =>
        http.send<UpdateLinksBatchResponse>('post', LINKS_BATCH_UPDATE_ENDPOINT, request),
    },
    folders: {
      list: () => http.send<ListFoldersResponse>('get', '/api/folders'),
      create: (request: CreateFolderRequest) =>
        http.send<FolderResponse>('post', '/api/folders', request),
      update: (id, request: UpdateFolderRequest) =>
        http.send<FolderResponse>('patch', `/api/folders/${enc(id)}`, request),
      reorder: (request: ReorderFoldersRequest) =>
        http.send<ListFoldersResponse>('put', '/api/folders/order', request),
      remove: (id, mode) =>
        http.send<void>('delete', `/api/folders/${enc(id)}${queryString({ mode })}`),
    },
    tags: {
      list: async () => (await http.send<ListTagsResponse>('get', '/api/tags')).items,
      create: (request: CreateTagRequest) => http.send<TagResponse>('post', '/api/tags', request),
      update: (id, request: UpdateTagRequest) =>
        http.send<TagResponse>('patch', `/api/tags/${enc(id)}`, request),
      remove: (id) => http.send<void>('delete', `/api/tags/${enc(id)}`),
      merge: (id, targetTagId) =>
        http.send<MergeTagResponse>('post', `/api/tags/${enc(id)}/merge`, { targetTagId }),
    },
    pins: {
      list: () => http.send<ListPinsResponse>('get', PIN_ENDPOINT),
      create: ({ kind, id }) => http.send<ListPinsResponse>('post', PIN_ENDPOINT, { kind, id }),
      remove: ({ kind, id }) =>
        http.send<void>('delete', `${PIN_ENDPOINT}/${enc(kind)}/${enc(id)}`),
      reorder: (refs) =>
        http.send<ListPinsResponse>('put', `${PIN_ENDPOINT}/order`, {
          items: refs.map(({ kind, id }) => ({ kind, id })),
        }),
    },
    views: {
      list: (feed?: ListSavedViewsQuery) =>
        http.send<ListSavedViewsResponse>(
          'get',
          `${SAVED_VIEW_ENDPOINT}${queryString({ ...feed })}`,
        ),
      create: (request: CreateSavedViewRequest) =>
        http.send<SavedViewResponse>('post', SAVED_VIEW_ENDPOINT, request),
      update: (id, request: UpdateSavedViewRequest) =>
        http.send<SavedViewResponse>('patch', `${SAVED_VIEW_ENDPOINT}/${enc(id)}`, request),
      remove: (id) => http.send<void>('delete', `${SAVED_VIEW_ENDPOINT}/${enc(id)}`),
      reorder: (ids) =>
        http.send<ListSavedViewsResponse>('put', `${SAVED_VIEW_ENDPOINT}/order`, { ids: [...ids] }),
    },
    trash: {
      list: () => http.send<ListTrashResponse>('get', TRASH_ENDPOINT.Base),
      restore: (items: readonly TrashItemRef[]) =>
        http.send<TrashActionResponse>('post', TRASH_ENDPOINT.Restore, { items: [...items] }),
      deleteForever: (items: readonly TrashItemRef[]) =>
        http.send<TrashActionResponse>('post', TRASH_ENDPOINT.Delete, { items: [...items] }),
      empty: () => http.send<TrashActionResponse>('delete', TRASH_ENDPOINT.Base),
    },
    me: {
      stats: () => http.send<MeStatsResponse>('get', ME_STATS_ENDPOINT),
    },
    settings: {
      get: () => http.send<UserSettingsResponse>('get', USER_SETTINGS_ENDPOINT),
      update: (request: UpdateUserSettingsRequest) =>
        http.send<UserSettingsResponse>('patch', USER_SETTINGS_ENDPOINT, request),
    },
    shares: {
      get: (folderId) =>
        http.send<FolderShareResponse>('get', `/api/folders/${enc(folderId)}/share`),
      enable: (folderId) =>
        http.send<FolderShareResponse>('post', `/api/folders/${enc(folderId)}/share`, {}),
      setShowNotes: (folderId, showNotes) =>
        http.send<FolderShareResponse>('patch', `/api/folders/${enc(folderId)}/share`, {
          showNotes,
        }),
      reset: (folderId) =>
        http.send<FolderShareResponse>('post', `/api/folders/${enc(folderId)}/share/reset`, {}),
      disable: (folderId) => http.send<void>('delete', `/api/folders/${enc(folderId)}/share`),
      collection: (token, query: PublicCollectionQuery = {}) =>
        http.send<PublicCollectionResponse>(
          'get',
          `/api/public/collections/${enc(token)}${queryString({ ...query })}`,
        ),
    },
    feedback: {
      list: async () =>
        (await http.send<ListFeedbackMessagesResponse>('get', FEEDBACK_ENDPOINT.Messages)).items,
      send: (request: SendFeedbackRequest) =>
        http.send<FeedbackMessage>('post', FEEDBACK_ENDPOINT.Messages, request),
      attachScreenshot: (id: string, upload: FeedbackScreenshotUpload) =>
        http.send<FeedbackMessage>('post', feedbackScreenshotsPath(id), upload),
    },
    exports: {
      download: async (query: ExportQuery) => {
        const { headers } = await http.download(`/api/export${queryString({ ...query })}`);
        const disposition = String(headers['content-disposition'] ?? '');
        return { fileName: /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? '' };
      },
    },
  };
}
