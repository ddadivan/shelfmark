import type { FolderResponse, LinkResponse, RuleResponse } from '@shelfmark/contracts';

const STAMP = '2026-01-01T00:00:00.000Z';

export function makeFolder(overrides: Partial<FolderResponse> & { id: string }): FolderResponse {
  return {
    parentId: null,
    name: overrides.id,
    colour: 'graphite',
    icon: 'folder',
    highlighted: false,
    description: null,
    coverLinkId: null,
    coverUrl: null,
    position: 0,
    pinned: false,
    linkCount: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeLink(overrides: Partial<LinkResponse> = {}): LinkResponse {
  return {
    id: 'link-1',
    kind: 'article',
    folderId: null,
    url: 'https://example.com/post',
    title: 'A post',
    note: null,
    faviconUrl: null,
    imageUrl: null,
    isFavorite: false,
    pinnedInFolderAt: null,
    pinned: false,
    lastOpenedAt: null,
    remindAt: null,
    tags: [],
    summary: null,
    summarySource: null,
    aiStatus: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeRule(overrides: Partial<RuleResponse> = {}): RuleResponse {
  return {
    id: 'rule-1',
    domain: 'example.com',
    folderId: null,
    folderAvailable: true,
    tags: [],
    createdAt: STAMP,
    ...overrides,
  };
}
