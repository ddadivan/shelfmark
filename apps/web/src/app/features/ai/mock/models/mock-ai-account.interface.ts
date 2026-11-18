import type { AiSettings, AiTier } from '@shelfmark/contracts';

/** The mock account's AI side as `localStorage` keeps it (`MOCK_AI_STORAGE_KEY`). */
export interface MockAiAccount {
  settings: AiSettings;
  introSeen: boolean;
  tier: AiTier;
  /** UTC month (`YYYY-MM`) `linksUsed` counts; another month starts at 0. */
  month: string;
  linksUsed: number;
  backfillUsed: number;
}
