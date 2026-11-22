import type { Provider } from '@angular/core';
import type {
  AiJobResponse,
  AiSettingsResponse,
  CreateAiDraftRequest,
  CreateFolderRequest,
  CreateLinkRequest,
  CreateLinksBatchRequest,
  CreateLinksBatchResponse,
  FolderResponse,
  GetSessionResponse,
  LinkLookupRequest,
  LinkLookupResponse,
  LinkResponse,
  ListFoldersResponse,
  ListRulesResponse,
  ListTagsResponse,
  RuleResponse,
  TagResponse,
} from '@shelfmark/contracts';
import { vi, type Mock } from 'vitest';
import { ShelfmarkApiService } from '../app/core/api/shelfmark-api.service';
import { BrowserTabsService } from '../app/core/chrome/browser-tabs.service';
import type { ActiveTab } from '../app/core/chrome/models/active-tab.interface';
import type { WindowTab } from '../app/core/chrome/models/window-tab.interface';
import { makeAiJob, makeAiSettings, makeFolder, makeLink } from './fixtures';

export const SIGNED_IN: NonNullable<GetSessionResponse> = {
  user: {
    id: 'u1',
    name: 'A',
    email: 'a@b.c',
    image: null,
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: null,
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z' },
};

export interface FakeData {
  tab: ActiveTab | null;
  /** The window's tabs as `windowTabs()` answers them (All tabs, #569). */
  windowTabs: WindowTab[];
  /** Whether the optional `tabs` permission is granted already. */
  tabsPermission: boolean;
  /** The answer of Chrome's permission prompt. */
  tabsPermissionAnswer: boolean;
  batch: CreateLinksBatchResponse;
  session: GetSessionResponse;
  folders: FolderResponse[];
  tags: TagResponse[];
  rules: RuleResponse[];
  lookup: LinkLookupResponse;
  created: LinkResponse;
  ai: AiSettingsResponse;
  draft: AiJobResponse;
}

export function fakeData(overrides: Partial<FakeData> = {}): FakeData {
  return {
    tab: { url: 'https://www.example.com/post', title: 'A post' },
    windowTabs: [],
    tabsPermission: false,
    tabsPermissionAnswer: true,
    batch: { links: [], errors: [] },
    session: SIGNED_IN,
    folders: [],
    tags: [],
    rules: [],
    lookup: { link: null },
    created: makeLink(),
    ai: makeAiSettings(),
    draft: makeAiJob(),
    ...overrides,
  };
}

export interface FakePopupApi {
  session: Mock<() => Promise<GetSessionResponse>>;
  folders: Mock<() => Promise<ListFoldersResponse>>;
  tags: Mock<() => Promise<ListTagsResponse>>;
  rules: Mock<() => Promise<ListRulesResponse>>;
  lookup: Mock<(body: LinkLookupRequest) => Promise<LinkLookupResponse>>;
  createFolder: Mock<(body: CreateFolderRequest) => Promise<FolderResponse>>;
  create: Mock<(body: CreateLinkRequest) => Promise<LinkResponse>>;
  createBatch: Mock<(body: CreateLinksBatchRequest) => Promise<CreateLinksBatchResponse>>;
  aiSettings: Mock<() => Promise<AiSettingsResponse>>;
  createAiDraft: Mock<(body: CreateAiDraftRequest) => Promise<AiJobResponse>>;
  aiJob: Mock<(id: string) => Promise<AiJobResponse>>;
}

export interface FakePopupTabs {
  active: Mock<() => Promise<ActiveTab | null>>;
  windowTabs: Mock<() => Promise<WindowTab[]>>;
  hasTabsPermission: Mock<() => Promise<boolean>>;
  requestTabsPermission: Mock<() => Promise<boolean>>;
  closeTabs: Mock<(ids: readonly number[]) => Promise<void>>;
  open: Mock<(url: string) => Promise<void>>;
  close: Mock<() => void>;
}

export interface FakePopupDeps {
  providers: Provider[];
  api: FakePopupApi;
  tabs: FakePopupTabs;
}

/** Providers for the fake API and tabs; the mocks are returned for assertions and per-test changes. */
export function fakePopupDeps(data: FakeData): FakePopupDeps {
  const api: FakePopupApi = {
    session: vi.fn(() => Promise.resolve(data.session)),
    folders: vi.fn(() =>
      Promise.resolve({ items: data.folders, counts: { all: 0, unsorted: 0, favorites: 0 } }),
    ),
    tags: vi.fn(() => Promise.resolve({ items: data.tags })),
    rules: vi.fn(() => Promise.resolve({ items: data.rules })),
    lookup: vi.fn(() => Promise.resolve(data.lookup)),
    createFolder: vi.fn((body: CreateFolderRequest) =>
      Promise.resolve(makeFolder({ id: 'new-folder', name: body.name })),
    ),
    create: vi.fn(() => Promise.resolve(data.created)),
    createBatch: vi.fn(() => Promise.resolve(data.batch)),
    aiSettings: vi.fn(() => Promise.resolve(data.ai)),
    createAiDraft: vi.fn(() => Promise.resolve(data.draft)),
    aiJob: vi.fn(() => Promise.resolve(data.draft)),
  };
  const tabs: FakePopupTabs = {
    active: vi.fn(() => Promise.resolve(data.tab)),
    windowTabs: vi.fn(() => Promise.resolve(data.windowTabs)),
    hasTabsPermission: vi.fn(() => Promise.resolve(data.tabsPermission)),
    requestTabsPermission: vi.fn(() => Promise.resolve(data.tabsPermissionAnswer)),
    closeTabs: vi.fn(() => Promise.resolve()),
    open: vi.fn(() => Promise.resolve()),
    close: vi.fn(),
  };
  return {
    api,
    tabs,
    providers: [
      { provide: ShelfmarkApiService, useValue: api },
      { provide: BrowserTabsService, useValue: tabs },
    ],
  };
}
