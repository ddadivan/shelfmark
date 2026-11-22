import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_JOB_STATUS,
  AI_PROVIDER_STATUS,
  AI_SEARCH_STATE,
  AI_SUMMARY_LANGUAGE_APP,
  AI_TIER,
  ASK_PERIOD,
  type AiJobResponse,
  type AiSettings,
  type AiSettingsResponse,
  type AiUsage,
  type LinkSuggestion,
  SUGGESTION_STATE,
  type SuggestionKind,
  type FolderResponse,
  type LinkResponse,
  type RuleResponse,
} from '@shelfmark/contracts';

import type { WindowTab } from '../app/core/chrome/models/window-tab.interface';

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

/** The account's AI settings: AI off unless `settings.enabled` is set. */
export function makeAiSettings(
  overrides: { settings?: Partial<AiSettings>; usage?: Partial<AiUsage> } = {},
): AiSettingsResponse {
  return {
    settings: {
      enabled: false,
      folderMode: AI_FEATURE_MODE.Suggest,
      tagsMode: AI_FEATURE_MODE.Suggest,
      summaries: true,
      includeNotes: false,
      summaryLanguage: AI_SUMMARY_LANGUAGE_APP,
      meaningSearch: true,
      ask: true,
      ...overrides.settings,
    },
    introSeen: true,
    announcementSeen: true,
    entitlements: { plan: ACCOUNT_PLAN.Free, aiTier: AI_TIER.Free },
    usage: {
      linksUsed: 0,
      linksLimit: 50,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 0,
      ...overrides.usage,
    },
    providerStatus: AI_PROVIDER_STATUS.Ok,
    pendingJobs: 0,
    backfill: {
      state: AI_BACKFILL_STATE.Idle,
      eligible: 0,
      total: 0,
      done: 0,
      estimatedMinutes: null,
    },
    search: { state: AI_SEARCH_STATE.Off, ready: 0, total: 0 },
    ask: {
      available: true,
      allowance: { questionsLeft: 5, period: ASK_PERIOD.Month, resetsOn: '2026-12-01' },
    },
  };
}

export function makeAiJob(overrides: Partial<AiJobResponse> = {}): AiJobResponse {
  return {
    id: 'job-1',
    status: AI_JOB_STATUS.Done,
    reason: null,
    suggestions: [],
    summary: null,
    title: null,
    ...overrides,
  };
}

export function makeSuggestion(
  id: string,
  kind: SuggestionKind,
  fields: { tagName?: string; folderId?: string; more?: boolean },
): LinkSuggestion {
  return {
    id,
    kind,
    state: SUGGESTION_STATE.Suggested,
    tagName: fields.tagName ?? null,
    folderId: fields.folderId ?? null,
    ...(fields.more === true && { more: true }),
  };
}

/** A tab of the window as `BrowserTabsService.windowTabs()` answers it. */
export function makeWindowTab(
  id: number,
  url: string | null,
  overrides: Partial<WindowTab> = {},
): WindowTab {
  return { id, active: false, url, title: `Tab ${id}`, favIconUrl: null, ...overrides };
}
