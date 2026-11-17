import { AI_TIER, type AiSettings, type AiTier } from '@shelfmark/contracts';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { isAiFeatureMode, isAiSummaryLanguage } from '../utils/ai-setting-values';
import type { MockAiAccount } from './models/mock-ai-account.interface';
import { MOCK_AI_STORAGE_KEY } from './models/mock-ai-storage-key.const';

/** The UTC month (`YYYY-MM`) of `now`. */
export function utcMonth(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

/** The first day (`YYYY-MM-DD`) of the UTC month after `now`: when the monthly count resets. */
export function nextUtcMonthStart(now: number): string {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
}

function isTier(value: unknown): value is AiTier {
  return Object.values<unknown>(AI_TIER).includes(value);
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function readSettings(value: unknown, fallback: AiSettings): AiSettings {
  const stored: Partial<Record<keyof AiSettings, unknown>> =
    typeof value === 'object' && value !== null ? value : {};
  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : fallback.enabled,
    folderMode: isAiFeatureMode(stored.folderMode) ? stored.folderMode : fallback.folderMode,
    tagsMode: isAiFeatureMode(stored.tagsMode) ? stored.tagsMode : fallback.tagsMode,
    summaries: typeof stored.summaries === 'boolean' ? stored.summaries : fallback.summaries,
    includeNotes:
      typeof stored.includeNotes === 'boolean' ? stored.includeNotes : fallback.includeNotes,
    summaryLanguage: isAiSummaryLanguage(stored.summaryLanguage)
      ? stored.summaryLanguage
      : fallback.summaryLanguage,
  };
}

/**
 * The mock account's AI settings and usage from `localStorage`. Nothing stored: AI off for a mock
 * account (AI pack, so "Process existing links" can be tried), on with the intro seen for the demo
 * (Free, like the API's demo seed). A count of another month reads as 0.
 */
export function readMockAiAccount(
  storage: Storage | undefined,
  demo: boolean,
  now: number,
): MockAiAccount {
  let stored: Partial<Record<keyof MockAiAccount, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(MOCK_AI_STORAGE_KEY) ?? '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      stored = parsed;
    }
  } catch {
    // Missing, blocked or broken storage: the defaults below.
  }
  const month = utcMonth(now);
  return {
    settings: readSettings(stored.settings, { ...AI_SETTINGS_DEFAULT, enabled: demo }),
    introSeen: typeof stored.introSeen === 'boolean' ? stored.introSeen : demo,
    tier: isTier(stored.tier) ? stored.tier : demo ? AI_TIER.Free : AI_TIER.AiPack,
    month,
    linksUsed: stored.month === month ? count(stored.linksUsed) : 0,
    backfillUsed: count(stored.backfillUsed),
  };
}

/** Stores the mock account's AI side; a blocked storage keeps nothing. */
export function writeMockAiAccount(storage: Storage | undefined, account: MockAiAccount): void {
  try {
    storage?.setItem(MOCK_AI_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Storage unavailable: the change lasts until the next read.
  }
}
