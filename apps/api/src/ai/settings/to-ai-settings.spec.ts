import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { toStoredAiSettings } from './to-ai-settings';

const ROW = {
  enabled: true,
  folderMode: 'auto',
  tagsMode: 'off',
  summaries: false,
  includeNotes: true,
  summaryLanguage: 'fr',
  meaningSearch: false,
  ask: false,
  enabledAt: new Date('2026-11-01T00:00:00Z'),
  introSeenAt: new Date('2026-11-01T00:00:00Z'),
  announcementSeenAt: new Date('2026-11-02T00:00:00Z'),
  backfillState: 'running',
  backfillTotal: 10,
  backfillDone: 4,
  backfillUsed: 4,
  embedFailedAt: null,
};

describe('toStoredAiSettings', () => {
  it('answers the defaults with AI off when there is no row', () => {
    expect(toStoredAiSettings(null)).toEqual({
      settings: AI_SETTINGS_DEFAULT,
      enabledAt: null,
      introSeenAt: null,
      announcementSeenAt: null,
      backfillState: 'idle',
      backfillTotal: 0,
      backfillDone: 0,
      backfillUsed: 0,
      embedFailedAt: null,
    });
    expect(AI_SETTINGS_DEFAULT.enabled).toBe(false);
  });

  it('maps a row', () => {
    expect(toStoredAiSettings(ROW)).toEqual({
      settings: {
        enabled: true,
        folderMode: 'auto',
        tagsMode: 'off',
        summaries: false,
        includeNotes: true,
        summaryLanguage: 'fr',
        meaningSearch: false,
        ask: false,
      },
      enabledAt: ROW.enabledAt,
      introSeenAt: ROW.introSeenAt,
      announcementSeenAt: ROW.announcementSeenAt,
      backfillState: 'running',
      backfillTotal: 10,
      backfillDone: 4,
      backfillUsed: 4,
      embedFailedAt: null,
    });
  });

  it('falls back to the defaults for values past the CHECKs', () => {
    const stored = toStoredAiSettings({
      ...ROW,
      folderMode: 'x',
      tagsMode: 'y',
      summaryLanguage: 'browser',
      backfillState: 'weird',
    });
    expect(stored.settings).toMatchObject({
      folderMode: 'suggest',
      tagsMode: 'suggest',
      summaryLanguage: 'app',
    });
    expect(stored.backfillState).toBe('idle');
  });
});
