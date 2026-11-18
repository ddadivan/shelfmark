import { AI_FEATURE_MODE, AI_TIER } from '@shelfmark/contracts';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import {
  nextUtcMonthStart,
  readMockAiAccount,
  utcMonth,
  writeMockAiAccount,
} from './mock-ai-account';
import { MOCK_AI_STORAGE_KEY } from './models/mock-ai-storage-key.const';

const NOW = Date.UTC(2026, 10, 17, 12);

describe('mock AI account', () => {
  afterEach(() => localStorage.clear());

  it('starts off for a mock account (AI pack) and on with the intro seen for the demo (Free)', () => {
    expect(readMockAiAccount(localStorage, false, NOW)).toEqual({
      settings: AI_SETTINGS_DEFAULT,
      introSeen: false,
      tier: AI_TIER.AiPack,
      month: '2026-11',
      linksUsed: 0,
      backfillUsed: 0,
    });
    const demo = readMockAiAccount(localStorage, true, NOW);
    expect(demo.settings.enabled).toBe(true);
    expect(demo.introSeen).toBe(true);
    expect(demo.tier).toBe(AI_TIER.Free);
  });

  it('keeps what was written and resets the monthly count in a new month', () => {
    const account = readMockAiAccount(localStorage, false, NOW);
    writeMockAiAccount(localStorage, {
      ...account,
      settings: { ...account.settings, enabled: true, tagsMode: AI_FEATURE_MODE.Auto },
      linksUsed: 7,
      backfillUsed: 3,
    });
    const again = readMockAiAccount(localStorage, false, NOW);
    expect(again.settings.tagsMode).toBe(AI_FEATURE_MODE.Auto);
    expect(again.linksUsed).toBe(7);
    const next = readMockAiAccount(localStorage, false, Date.UTC(2026, 11, 1));
    expect(next.linksUsed).toBe(0);
    expect(next.backfillUsed).toBe(3);
  });

  it('reads broken values as the defaults', () => {
    localStorage.setItem(
      MOCK_AI_STORAGE_KEY,
      JSON.stringify({ settings: { folderMode: 'x', summaryLanguage: 'browser' }, tier: 'gold' }),
    );
    const account = readMockAiAccount(localStorage, false, NOW);
    expect(account.settings).toEqual(AI_SETTINGS_DEFAULT);
    expect(account.tier).toBe(AI_TIER.AiPack);
    localStorage.setItem(MOCK_AI_STORAGE_KEY, '{');
    expect(readMockAiAccount(localStorage, false, NOW).settings).toEqual(AI_SETTINGS_DEFAULT);
    expect(readMockAiAccount(undefined, false, NOW).introSeen).toBe(false);
  });

  it('names the UTC month and the first day of the next one', () => {
    expect(utcMonth(NOW)).toBe('2026-11');
    expect(nextUtcMonthStart(NOW)).toBe('2026-12-01');
    expect(nextUtcMonthStart(Date.UTC(2026, 11, 31, 23))).toBe('2027-01-01');
  });
});
