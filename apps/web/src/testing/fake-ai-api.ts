import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  type AiSettingsResponse,
} from '@shelfmark/contracts';
import { of } from 'rxjs';
import type { AiApi } from '../app/features/ai/models/ai-api.interface';
import { AI_SETTINGS_DEFAULT } from '../app/features/ai/models/ai-settings-default.const';

/** Every method of `AiApi` as a Vitest mock (spec helper). */
export type FakeAiApi = { [K in keyof AiApi]: ReturnType<typeof vi.fn<AiApi[K]>> };

/** `GET /api/ai/settings` with AI on (Suggest modes, summaries), changed by `patch`. */
export function aiSettingsResponse(patch: Partial<AiSettingsResponse> = {}): AiSettingsResponse {
  return {
    settings: { ...AI_SETTINGS_DEFAULT, enabled: true },
    introSeen: true,
    entitlements: { plan: ACCOUNT_PLAN.Pro, aiTier: AI_TIER.AiPack },
    usage: {
      linksUsed: 3,
      linksLimit: 1000,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 5000,
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
    ...patch,
  };
}

/** A fake `AI_API`: settings answer `settings`, every other method must be given by the spec. */
export function fakeAiApi(settings: AiSettingsResponse = aiSettingsResponse()): FakeAiApi {
  return {
    getSettings: vi.fn<AiApi['getSettings']>(() => of(settings)),
    updateSettings: vi.fn<AiApi['updateSettings']>(),
    createDraft: vi.fn<AiApi['createDraft']>(),
    getJob: vi.fn<AiApi['getJob']>(),
    dismissSuggestion: vi.fn<AiApi['dismissSuggestion']>(() => of(undefined)),
    getBackfill: vi.fn<AiApi['getBackfill']>(),
    startBackfill: vi.fn<AiApi['startBackfill']>(),
    stopBackfill: vi.fn<AiApi['stopBackfill']>(),
    tick: vi.fn<AiApi['tick']>(),
    deleteData: vi.fn<AiApi['deleteData']>(),
    getTidy: vi.fn<AiApi['getTidy']>(),
    getTidyCount: vi.fn<AiApi['getTidyCount']>(),
    applyTidy: vi.fn<AiApi['applyTidy']>(),
    undoTidy: vi.fn<AiApi['undoTidy']>(),
    getLinkAi: vi.fn<AiApi['getLinkAi']>(),
    rewriteSummary: vi.fn<AiApi['rewriteSummary']>(),
    undoApply: vi.fn<AiApi['undoApply']>(),
  };
}
