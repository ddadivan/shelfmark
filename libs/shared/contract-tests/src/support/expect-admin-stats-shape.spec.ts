import {
  ADMIN_STATS_FEATURE,
  FEEDBACK_MILESTONE,
  type AdminStatsResponse,
} from '@shelfmark/contracts';
import { expectAdminStatsShape } from './expect-admin-stats-shape';

const NOW = new Date('2026-11-15T10:00:00Z');
const DAY_MS = 86_400_000;

function days(count: number, step: number, last: number): { start: string; count: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    start: new Date(last - (count - 1 - i) * step * DAY_MS).toISOString().slice(0, 10),
    count: 1,
  }));
}

function valid(): AdminStatsResponse {
  const today = Date.parse('2026-11-15T00:00:00Z');
  const rate = { base: 10, count: 4, share: 0.4 };
  return {
    generatedAt: NOW.toISOString(),
    minGroup: 3,
    overview: {
      realUsers: 10,
      demoSandboxes: 2,
      onboarded: rate,
      signUpsByDay: days(30, 1, today),
      signUpsByWeek: days(12, 7, Date.parse('2026-11-09T00:00:00Z')),
      active7d: rate,
      active30d: rate,
      returnedAfterWeek: { base: 2, count: null, share: null },
      returnedAfterMonth: { base: 0, count: null, share: null },
      activitySince: '2026-11-01',
    },
    features: {
      linksPerUser: {
        mean: 4.5,
        median: 3,
        buckets: [
          { key: '0', count: 0 },
          { key: '1-9', count: 7 },
          { key: 'other', count: 3 },
        ],
      },
      adoption: Object.values(ADMIN_STATS_FEATURE).map((feature) => ({ feature, rate })),
    },
    preferences: {
      theme: [
        { key: 'dark', count: 5 },
        { key: 'never', count: 5 },
      ],
      language: [{ key: 'other', count: null }],
      trashRetention: [{ key: '30', count: 10 }],
    },
    ratings: {
      milestones: Object.values(FEEDBACK_MILESTONE).map((milestone) => ({
        milestone,
        answered: 1,
        skipped: 0,
        mean: null,
        median: null,
        low: null,
        mid: null,
        high: null,
      })),
      messagesByKind: [{ key: 'idea', count: 1 }],
      messagesByStatus: [{ key: 'received', count: 1 }],
    },
  };
}

type Mutable = Record<string, unknown>;

function broken(change: (stats: Mutable) => void): unknown {
  const stats = structuredClone(valid()) as unknown as Mutable;
  change(stats);
  return stats;
}

function at(stats: Mutable, ...path: (string | number)[]): Mutable {
  return path.reduce<Mutable>((node, key) => node[key] as Mutable, stats);
}

describe('expectAdminStatsShape', () => {
  it('accepts a response in the agreed shape', () => {
    expect(() => expectAdminStatsShape(valid(), NOW)).not.toThrow();
  });

  it.each<[string, (stats: Mutable) => void, RegExp]>([
    ['an extra field', (s) => (at(s, 'overview')['email'] = 'a@b.c'), /overview: has keys/],
    ['a missing field', (s) => delete at(s, 'ratings')['messagesByKind'], /ratings: has keys/],
    ['a user id on a bucket', (s) => (at(s, 'preferences', 'theme', 0)['id'] = 'x'), /theme\[0\]/],
    [
      'a shown share of a small base',
      (s) => (at(s, 'overview')['returnedAfterWeek'] = { base: 2, count: 1, share: 0.5 }),
      /shows a base of 2/,
    ],
    [
      'a hidden share of a large base',
      (s) => (at(s, 'overview')['active7d'] = { base: 10, count: null, share: null }),
      /count/,
    ],
    [
      'a count above its base',
      (s) => (at(s, 'overview')['active7d'] = { base: 10, count: 11, share: 1 }),
      /more than its base/,
    ],
    ['a group of 2', (s) => (at(s, 'preferences', 'theme', 0)['count'] = 2), /group of 2/],
    [
      'an unknown bucket key',
      (s) => (at(s, 'preferences', 'theme', 0)['key'] = 'a@b.c'),
      /outside the allow-list/,
    ],
    [
      'buckets out of order',
      (s) =>
        (at(s, 'preferences')['theme'] = [
          { key: 'never', count: 5 },
          { key: 'dark', count: 5 },
        ]),
      /out of order/,
    ],
    [
      'a null bucket that is not Other',
      (s) => (at(s, 'preferences', 'theme', 0)['count'] = null),
      /is null/,
    ],
    ['a short series', (s) => (at(s, 'overview')['signUpsByDay'] = []), /0 points/],
    [
      'a gap in a series',
      (s) => (at(s, 'overview', 'signUpsByDay', 0)['start'] = '2026-01-01'),
      /consecutive/,
    ],
    [
      'a features list out of order',
      (s) =>
        (at(s, 'features')['adoption'] = [
          ...(at(s, 'features')['adoption'] as unknown[]),
        ].reverse()),
      /out of order/,
    ],
    [
      'a shown rating of 1 person',
      (s) => (at(s, 'ratings', 'milestones', 0)['mean'] = 9),
      /ratings of 1 people/,
    ],
    ['a mean while too few users', (s) => (at(s, 'overview')['realUsers'] = 2), /is shown/],
    ['another minimum group size', (s) => (s['minGroup'] = 1), /minGroup/],
    ['a non-ISO time', (s) => (s['generatedAt'] = 'yesterday'), /generatedAt/],
    ['a bad activity day', (s) => (at(s, 'overview')['activitySince'] = 5), /activitySince/],
    ['a fractional count', (s) => (at(s, 'overview')['realUsers'] = 1.5), /not a count/],
    ['a list that is not a list', (s) => (at(s, 'ratings')['milestones'] = {}), /not a list/],
    ['an object that is not an object', (s) => (s['overview'] = []), /not an object/],
  ])('rejects %s', (_label, change, message) => {
    expect(() => expectAdminStatsShape(broken(change), NOW)).toThrow(message);
  });

  it('rejects a day series that does not end today', () => {
    expect(() => expectAdminStatsShape(valid(), new Date('2026-11-20T00:00:00Z'))).toThrow(
      /does not end today/,
    );
  });
});
