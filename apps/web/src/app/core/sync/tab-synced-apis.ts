import type {
  CreateFolderRequest,
  CreateLinkRequest,
  CreateLinksBatchRequest,
  CreateTagRequest,
  FolderDeleteMode,
  ListLinksQuery,
  RecentLinksQuery,
  UpdateFolderRequest,
  UpdateLinkRequest,
  UpdateTagRequest,
} from '@shelfmark/contracts';
import { tap, type Observable } from 'rxjs';
import type { FoldersApi } from '../../features/links/models/folders-api.interface';
import type { LinksApi } from '../../features/links/models/links-api.interface';
import type { TagsApi } from '../../features/links/models/tags-api.interface';
import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';
import type { TabSyncService } from './tab-sync.service';

/** Posts `event` to the other tabs once the request succeeded. */
function after<T>(source: Observable<T>, post: (value: T) => void): Observable<T> {
  return source.pipe(tap({ next: post }));
}

/**
 * The links seam with tab sync (#268): a successful create, update or delete is posted to the
 * other tabs. Reads, previews, opens and image captures are not changes to share.
 */
export function tabSyncedLinksApi(inner: LinksApi, sync: TabSyncService): LinksApi {
  return {
    preview: (url: string) => inner.preview(url),
    list: (query?: ListLinksQuery) => inner.list(query),
    recent: (query?: RecentLinksQuery) => inner.recent(query),
    removeRecent: (id: string) => inner.removeRecent(id),
    clearRecent: () => inner.clearRecent(),
    get: (id: string) => inner.get(id),
    open: (id: string) => inner.open(id),
    captureImages: (id: string) => inner.captureImages(id),
    create: (request: CreateLinkRequest) =>
      after(inner.create(request), (link) => sync.post({ kind: TAB_SYNC_KIND.LinkSaved, link })),
    update: (id: string, request: UpdateLinkRequest) =>
      after(inner.update(id, request), (link) =>
        sync.post({ kind: TAB_SYNC_KIND.LinkChanged, link }),
      ),
    remove: (id: string) =>
      after(inner.remove(id), () => sync.post({ kind: TAB_SYNC_KIND.LinkRemoved, id })),
    // A paste of several links, or its Undo: the other tabs reload the feed and the sidebar.
    createBatch: (request: CreateLinksBatchRequest) =>
      after(inner.createBatch(request), () => sync.post({ kind: TAB_SYNC_KIND.LibraryChanged })),
    removeBatch: (ids: readonly string[]) =>
      after(inner.removeBatch(ids), () => sync.post({ kind: TAB_SYNC_KIND.LibraryChanged })),
  };
}

/** The folders seam with tab sync: every successful write tells the other tabs the library changed. */
export function tabSyncedFoldersApi(inner: FoldersApi, sync: TabSyncService): FoldersApi {
  const changed = () => sync.post({ kind: TAB_SYNC_KIND.LibraryChanged });
  return {
    list: () => inner.list(),
    create: (request: CreateFolderRequest) => after(inner.create(request), changed),
    update: (id: string, request: UpdateFolderRequest) => after(inner.update(id, request), changed),
    remove: (id: string, mode: FolderDeleteMode) => after(inner.remove(id, mode), changed),
  };
}

/** The tags seam with tab sync: every successful write tells the other tabs the library changed. */
export function tabSyncedTagsApi(inner: TagsApi, sync: TabSyncService): TagsApi {
  const changed = () => sync.post({ kind: TAB_SYNC_KIND.LibraryChanged });
  return {
    list: () => inner.list(),
    create: (request: CreateTagRequest) => after(inner.create(request), changed),
    update: (id: string, request: UpdateTagRequest) => after(inner.update(id, request), changed),
    remove: (id: string) => after(inner.remove(id), changed),
    merge: (id: string, targetTagId: string) => after(inner.merge(id, targetTagId), changed),
  };
}
