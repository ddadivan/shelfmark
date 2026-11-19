import { AI_QUOTA } from './ai-quota.const';
import { AI_TIER } from './ai-tier.const';

describe('AI_QUOTA', () => {
  it('has limits for every tier and nothing else', () => {
    expect(Object.keys(AI_QUOTA).sort()).toEqual(Object.values(AI_TIER).sort());
  });

  it('keeps the ADR 0047 starting limits and the one-time backfill allowance', () => {
    expect(AI_QUOTA[AI_TIER.Free]).toEqual({
      linksPerMonth: 50,
      backfillLinks: 0,
      embedsPerMonth: 2000,
      searchQueriesPerMonth: 1000,
      questionsPerDay: 5,
      questionsPerMonth: 5,
      cleanupAiRunsPerMonth: 0,
    });
    expect(AI_QUOTA[AI_TIER.AiPack]).toEqual({
      linksPerMonth: 1000,
      backfillLinks: 5000,
      embedsPerMonth: 20000,
      searchQueriesPerMonth: 10000,
      questionsPerDay: 50,
      questionsPerMonth: 500,
      cleanupAiRunsPerMonth: 10,
    });
  });
});
