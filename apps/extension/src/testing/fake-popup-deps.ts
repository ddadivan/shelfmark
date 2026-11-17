import type { Provider } from '@angular/core';
import type {
  CreateFolderRequest,
  CreateLinkRequest,
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
import { makeFolder, makeLink } from './fixtures';

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
  session: GetSessionResponse;
  folders: FolderResponse[];
  tags: TagResponse[];
  rules: RuleResponse[];
  lookup: LinkLookupResponse;
  created: LinkResponse;
}

export function fakeData(overrides: Partial<FakeData> = {}): FakeData {
  return {
    tab: { url: 'https://www.example.com/post', title: 'A post' },
    session: SIGNED_IN,
    folders: [],
    tags: [],
    rules: [],
    lookup: { link: null },
    created: makeLink(),
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
}

export interface FakePopupTabs {
  active: Mock<() => Promise<ActiveTab | null>>;
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
  };
  const tabs: FakePopupTabs = {
    active: vi.fn(() => Promise.resolve(data.tab)),
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
