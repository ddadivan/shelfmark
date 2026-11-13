import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ContractApis } from '@shelfmark/contract-tests';
import { AuthStore } from '../../core/auth/auth.store';
import { MOCK_SESSION_STORAGE_KEY } from '../../core/auth/models/mock-session-storage-key.const';
import { MockFeedbackApi } from '../../features/feedback/mock/mock-feedback.api';
import { MockFoldersApi } from '../../features/links/mock/mock-folders.api';
import { MockLibraryData } from '../../features/links/mock/mock-library-data';
import { MockLinksApi } from '../../features/links/mock/mock-links.api';
import { MockTagsApi } from '../../features/links/mock/mock-tags.api';
import { MockPinsApi } from '../../features/pins/mock/mock-pins.api';
import { MockUserSettingsApi } from '../../features/settings/mock/mock-user-settings.api';
import { MockSharesApi } from '../../features/sharing/mock/mock-shares.api';
import { MockTrashApi } from '../../features/trash/mock/mock-trash.api';
import { MockSavedViewsApi } from '../../features/views/mock/mock-saved-views.api';
import { MockExportApi } from '../../features/export/mock/mock-export.api';
import { exportedFileName } from './exported-file-name';
import { settle, settlePromise } from './settle';

const ACCOUNT = { id: 'contract-user', name: 'Contract', email: 'contract@example.com' } as const;

/**
 * Runner A: `ContractApis` over the mock API classes, on a new empty account. The mocks start from
 * demo data, which is cleared here; the starter views stay (the API's sign-up trigger creates the
 * same ones). Needs fake timers (`vi.useFakeTimers()`), see `settle`.
 */
export function createMockContractApis(): ContractApis {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(ACCOUNT));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthStore,
        useValue: { user: signal({ name: ACCOUNT.name, isDemo: false }) },
      },
    ],
  });
  const data = TestBed.inject(MockLibraryData);
  data.links = [];
  data.setFolders([]);
  data.setTags([]);
  data.pins = [];
  data.trash = [];

  const links = TestBed.inject(MockLinksApi);
  const folders = TestBed.inject(MockFoldersApi);
  const tags = TestBed.inject(MockTagsApi);
  const pins = TestBed.inject(MockPinsApi);
  const views = TestBed.inject(MockSavedViewsApi);
  const trash = TestBed.inject(MockTrashApi);
  const settings = TestBed.inject(MockUserSettingsApi);
  const shares = TestBed.inject(MockSharesApi);
  const feedback = TestBed.inject(MockFeedbackApi);
  const exporter = TestBed.inject(MockExportApi);

  return {
    links: {
      create: (request) => settle(links.create(request)),
      list: (query) => settle(links.list(query)),
      recent: (query) => settle(links.recent(query)),
      removeRecent: (id) => settle(links.removeRecent(id)),
      clearRecent: () => settle(links.clearRecent()),
      get: (id) => settle(links.get(id)),
      update: (id, request) => settle(links.update(id, request)),
      remove: (id) => settle(links.remove(id)),
      open: (id) => settle(links.open(id)),
      createBatch: (request) => settle(links.createBatch(request)),
      removeBatch: (ids) => settle(links.removeBatch(ids)),
      updateBatch: (request) => settle(links.updateBatch(request)),
    },
    folders: {
      list: () => settle(folders.list()),
      create: (request) => settle(folders.create(request)),
      update: (id, request) => settle(folders.update(id, request)),
      reorder: (request) => settle(folders.reorder(request)),
      remove: (id, mode) => settle(folders.remove(id, mode)),
    },
    tags: {
      list: () => settle(tags.list()),
      create: (request) => settle(tags.create(request)),
      update: (id, request) => settle(tags.update(id, request)),
      remove: (id) => settle(tags.remove(id)),
      merge: (id, targetTagId) => settle(tags.merge(id, targetTagId)),
    },
    pins: {
      list: () => settle(pins.list()),
      create: (ref) => settle(pins.create(ref)),
      remove: (ref) => settle(pins.remove(ref)),
      reorder: (refs) => settle(pins.reorder(refs)),
    },
    views: {
      list: (feed) => settle(views.list(feed)),
      create: (request) => settle(views.create(request)),
      update: (id, request) => settle(views.update(id, request)),
      remove: (id) => settle(views.remove(id)),
      reorder: (ids) => settle(views.reorder(ids)),
    },
    trash: {
      list: () => settle(trash.list()),
      restore: (items) => settle(trash.restore(items)),
      deleteForever: (items) => settle(trash.deleteForever(items)),
      empty: () => settle(trash.empty()),
    },
    settings: {
      get: () => settle(settings.get()),
      update: (request) => settle(settings.update(request)),
    },
    shares: {
      get: (folderId) => settle(shares.get(folderId)),
      enable: (folderId) => settle(shares.enable(folderId)),
      setShowNotes: (folderId, showNotes) => settle(shares.setShowNotes(folderId, showNotes)),
      reset: (folderId) => settle(shares.reset(folderId)),
      disable: (folderId) => settle(shares.disable(folderId)),
      collection: (token, query = {}) => settle(shares.collection(token, query)),
    },
    feedback: {
      list: () => settlePromise(feedback.list()),
      send: (request) => settlePromise(feedback.send(request)),
    },
    exports: {
      download: async ({ format, ...scope }) => {
        const fileName = await exportedFileName(() =>
          settle(exporter.download(format, { ...scope, tags: scope.tag })),
        );
        return { fileName };
      },
    },
  };
}
