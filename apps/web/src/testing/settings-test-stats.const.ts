import { AUTH_PROVIDER, statsWeekStarts, type MeStatsResponse } from '@shelfmark/contracts';

/** `GET /api/me/stats` of the settings specs' test user. */
export const SETTINGS_TEST_STATS: MeStatsResponse = {
  linkCount: 1234,
  folderCount: 7,
  tagCount: 12,
  topSites: [
    { host: 'github.com', count: 40, faviconUrl: '/api/links/l1/favicon?v=abc' },
    { host: 'angular.dev', count: 12, faviconUrl: null },
  ],
  topTags: [
    { name: 'angular', count: 30 },
    { name: 'reading', count: 9 },
  ],
  weeklyLinks: statsWeekStarts(new Date('2026-11-13T12:00:00Z')).map((weekStart, index) => ({
    weekStart,
    count: index === 11 ? 8 : index % 3,
  })),
  memberSince: '2025-09-14T10:00:00.000Z',
  oldestLinkAt: '2025-09-15T10:00:00.000Z',
  connectedAccounts: [{ provider: AUTH_PROVIDER.GitHub, connectedAt: '2025-09-14T10:00:00.000Z' }],
};
