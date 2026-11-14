import {
  ADMIN_STATS_FEATURE,
  ADMIN_STATS_LIMIT,
  FEEDBACK_MILESTONE,
  type AdminStatsFeature,
  type AdminStatsPoint,
  type AdminStatsRate,
  type AdminStatsResponse,
} from '@shelfmark/contracts';

const DAY_MS = 86_400_000;
const K = ADMIN_STATS_LIMIT.MinGroup;

function day(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function rate(base: number, count: number): AdminStatsRate {
  return base < K
    ? { base, count: null, share: null }
    : { base, count, share: Math.round((count / base) * 1000) / 1000 };
}

/** The counts as a series of days (oldest first, today last) or Mondays of ISO weeks. */
function series(now: Date, counts: readonly number[], stepDays: number): AdminStatsPoint[] {
  const today = Date.parse(`${day(now.getTime())}T00:00:00Z`);
  const last = stepDays === 7 ? today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS : today;
  return counts.map((count, index) => ({
    start: day(last - (counts.length - 1 - index) * stepDays * DAY_MS),
    count,
  }));
}

const SIGN_UPS_BY_DAY = [
  0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 3, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 2, 0, 0, 1, 0, 1,
];
const SIGN_UPS_BY_WEEK = [2, 3, 1, 4, 2, 5, 3, 4, 6, 5, 4, 3];

const ADOPTION: Readonly<Record<AdminStatsFeature, number>> = {
  [ADMIN_STATS_FEATURE.Folders]: 34,
  [ADMIN_STATS_FEATURE.NestedFolders]: 15,
  [ADMIN_STATS_FEATURE.Tags]: 29,
  [ADMIN_STATS_FEATURE.Favorites]: 25,
  [ADMIN_STATS_FEATURE.Notes]: 12,
  [ADMIN_STATS_FEATURE.SidebarPins]: 9,
  [ADMIN_STATS_FEATURE.FolderPins]: 4,
  [ADMIN_STATS_FEATURE.SavedViews]: 7,
  [ADMIN_STATS_FEATURE.Trash]: 21,
  [ADMIN_STATS_FEATURE.PublicCollections]: 3,
  [ADMIN_STATS_FEATURE.OwnColours]: 5,
  [ADMIN_STATS_FEATURE.OwnEmoji]: 6,
  [ADMIN_STATS_FEATURE.OpenedRecently]: 27,
  [ADMIN_STATS_FEATURE.HistoryPaused]: 2,
  [ADMIN_STATS_FEATURE.PreviewsOff]: 3,
};

/**
 * Realistic stats for the mock admin API: 47 real users, every section filled, with the small
 * theme and language groups already merged into "Other" and one milestone with too few answers,
 * as the API would answer them (minimum group size 3). `few` is a shelf of 2 real users, where
 * every share, mean and group is hidden.
 */
export function buildMockAdminStats(now: Date, few = false): AdminStatsResponse {
  const generatedAt = now.toISOString();
  const noRatings = Object.values(FEEDBACK_MILESTONE).map((milestone) => ({
    milestone,
    answered: 0,
    skipped: 0,
    mean: null,
    median: null,
    low: null,
    mid: null,
    high: null,
  }));
  if (few) {
    const byDay = SIGN_UPS_BY_DAY.map(() => 0);
    byDay[byDay.length - 1] = 1;
    byDay[byDay.length - 4] = 1;
    const byWeek = SIGN_UPS_BY_WEEK.map(() => 0);
    byWeek[byWeek.length - 1] = 2;
    return {
      generatedAt,
      minGroup: K,
      overview: {
        realUsers: 2,
        demoSandboxes: 1,
        onboarded: rate(2, 2),
        signUpsByDay: series(now, byDay, 1),
        signUpsByWeek: series(now, byWeek, 7),
        active7d: rate(2, 2),
        active30d: rate(2, 2),
        returnedAfterWeek: rate(0, 0),
        returnedAfterMonth: rate(0, 0),
        activitySince: day(now.getTime() - 3 * DAY_MS),
      },
      features: {
        linksPerUser: {
          mean: null,
          median: null,
          buckets: [
            { key: '10-49', count: 0 },
            { key: '50-99', count: 0 },
            { key: '100+', count: 0 },
            { key: 'other', count: null },
          ],
        },
        adoption: Object.values(ADMIN_STATS_FEATURE).map((feature) => ({
          feature,
          rate: rate(2, 0),
        })),
      },
      preferences: {
        theme: [
          { key: 'system', count: 0 },
          { key: 'light', count: 0 },
          { key: 'dark', count: 0 },
          { key: 'custom', count: 0 },
          { key: 'other', count: null },
        ],
        language: [
          ...['browser', 'en', 'fr', 'de', 'it', 'es', 'pt', 'uk'].map((key) => ({
            key,
            count: 0,
          })),
          { key: 'other', count: null },
        ],
        trashRetention: [
          { key: '7', count: 0 },
          { key: '90', count: 0 },
          { key: 'other', count: null },
        ],
      },
      ratings: {
        milestones: noRatings,
        messagesByKind: [
          { key: 'idea', count: 1 },
          { key: 'problem', count: 0 },
          { key: 'other', count: 0 },
        ],
        messagesByStatus: [
          { key: 'received', count: 1 },
          { key: 'planned', count: 0 },
          { key: 'in-progress', count: 0 },
          { key: 'done', count: 0 },
          { key: 'not-planned', count: 0 },
        ],
      },
    };
  }
  const users = 47;
  return {
    generatedAt,
    minGroup: K,
    overview: {
      realUsers: users,
      demoSandboxes: 6,
      onboarded: rate(users, 41),
      signUpsByDay: series(now, SIGN_UPS_BY_DAY, 1),
      signUpsByWeek: series(now, SIGN_UPS_BY_WEEK, 7),
      active7d: rate(users, 18),
      active30d: rate(users, 31),
      returnedAfterWeek: rate(39, 22),
      returnedAfterMonth: rate(24, 11),
      activitySince: day(now.getTime() - 10 * DAY_MS),
    },
    features: {
      linksPerUser: {
        mean: 23.4,
        median: 9,
        buckets: [
          { key: '0', count: 6 },
          { key: '1-9', count: 18 },
          { key: '10-49', count: 15 },
          { key: '50-99', count: 5 },
          { key: '100+', count: 3 },
        ],
      },
      adoption: Object.values(ADMIN_STATS_FEATURE).map((feature) => ({
        feature,
        rate: rate(users, ADOPTION[feature]),
      })),
    },
    preferences: {
      // custom (2) is merged with the next smallest, system (4), into Other.
      theme: [
        { key: 'light', count: 9 },
        { key: 'dark', count: 14 },
        { key: 'never', count: 18 },
        { key: 'other', count: 6 },
      ],
      // fr (2) and es (1) together in Other.
      language: [
        { key: 'browser', count: 3 },
        { key: 'en', count: 6 },
        { key: 'de', count: 4 },
        { key: 'it', count: 0 },
        { key: 'pt', count: 0 },
        { key: 'uk', count: 3 },
        { key: 'never', count: 28 },
        { key: 'other', count: 3 },
      ],
      trashRetention: [
        { key: '7', count: 5 },
        { key: '30', count: 38 },
        { key: '90', count: 4 },
      ],
    },
    ratings: {
      milestones: [
        {
          milestone: 'day3',
          answered: 21,
          skipped: 6,
          mean: 8.1,
          median: 8,
          low: 3,
          mid: 9,
          high: 9,
        },
        {
          milestone: 'week1',
          answered: 12,
          skipped: 4,
          mean: 7.6,
          median: 8,
          low: 3,
          mid: 5,
          high: 4,
        },
        { ...noRatings[2], answered: 2, skipped: 1 },
        noRatings[3],
      ],
      messagesByKind: [
        { key: 'idea', count: 9 },
        { key: 'problem', count: 5 },
        { key: 'other', count: 2 },
      ],
      messagesByStatus: [
        { key: 'received', count: 6 },
        { key: 'planned', count: 4 },
        { key: 'in-progress', count: 2 },
        { key: 'done', count: 3 },
        { key: 'not-planned', count: 1 },
      ],
    },
  };
}
