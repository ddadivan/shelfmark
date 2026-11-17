import {
  ADMIN_STATS_BUCKET_KEY,
  ADMIN_STATS_FEATURE,
  ADMIN_STATS_LIMIT,
  ADMIN_STATS_LINKS_BUCKET,
  ADMIN_STATS_SCORE_GROUP,
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MILESTONE,
  FEEDBACK_STATUS,
  INTERFACE_LANGUAGE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
} from '@shelfmark/contracts';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const DAY_MS = 86_400_000;

type Json = Readonly<Record<string, unknown>>;

function fail(path: string, message: string): never {
  throw new Error(`admin stats ${path}: ${message}`);
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `value` is an object with exactly `keys` (the allow-list: no extra field may ever appear). */
function exactly(value: unknown, path: string, keys: readonly string[]): Json {
  if (!isObject(value)) fail(path, 'is not an object');
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join(',') !== expected.join(',')) {
    fail(path, `has keys [${actual.join(', ')}], allowed [${expected.join(', ')}]`);
  }
  return value;
}

function count(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(path, `is not a count (${String(value)})`);
  }
  return value;
}

function nullableNumber(value: unknown, path: string, min: number, max: number): void {
  if (value === null) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(path, `is not null or a number from ${min} to ${max} (${String(value)})`);
  }
}

function list(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(path, 'is not a list');
  return value;
}

/**
 * A rate: `null` while the base is below the minimum group size, and never shown with a group of 1
 * to `minGroup - 1` on either side (`count` or `base - count`).
 */
function rate(value: unknown, path: string, minGroup: number): void {
  const r = exactly(value, path, ['base', 'count', 'share']);
  const base = count(r['base'], `${path}.base`);
  if (r['count'] === null || base < minGroup) {
    if (r['count'] !== null || r['share'] !== null) fail(path, `shows a base of ${base}`);
    return;
  }
  const c = count(r['count'], `${path}.count`);
  if (c > base) fail(path, 'counts more than its base');
  const small = (group: number) => group > 0 && group < minGroup;
  if (small(c)) fail(path, `shows a group of ${c}`);
  if (small(base - c)) fail(path, `shows that ${base - c} do not`);
  nullableNumber(r['share'], `${path}.share`, 0, 1);
  if (r['share'] === null) fail(path, 'has no share');
}

/** Buckets with allow-listed keys in order, `other` last, and no group of 1 to `minGroup - 1`. */
function buckets(
  value: unknown,
  path: string,
  keys: readonly string[],
  minGroup: number,
  suppressed = true,
): void {
  const items = list(value, path);
  const allowed = [...keys, ADMIN_STATS_BUCKET_KEY.Other];
  let last = -1;
  for (const [i, item] of items.entries()) {
    const at = `${path}[${i}]`;
    const b = exactly(item, at, ['key', 'count']);
    const index = allowed.indexOf(String(b['key']));
    if (index < 0) fail(at, `has the key "${String(b['key'])}" outside the allow-list`);
    if (index <= last) fail(at, 'is out of order or repeated');
    last = index;
    if (b['count'] === null) {
      if (!suppressed || b['key'] !== ADMIN_STATS_BUCKET_KEY.Other) fail(at, 'is null');
      continue;
    }
    const c = count(b['count'], `${at}.count`);
    if (suppressed && c > 0 && c < minGroup) fail(at, `shows a group of ${c}`);
  }
}

function points(value: unknown, path: string, length: number, stepDays: number): void {
  const items = list(value, path);
  if (items.length !== length) fail(path, `has ${items.length} points, expected ${length}`);
  let previous: number | null = null;
  for (const [i, item] of items.entries()) {
    const at = `${path}[${i}]`;
    const p = exactly(item, at, ['start', 'count']);
    const start = p['start'];
    if (typeof start !== 'string' || !DAY.test(start)) fail(at, 'has no day');
    count(p['count'], `${at}.count`);
    const time = Date.parse(`${start}T00:00:00Z`);
    if (previous !== null && time - previous !== stepDays * DAY_MS) fail(at, 'is not consecutive');
    previous = time;
  }
}

/**
 * Fails unless `stats` is an `AdminStatsResponse` with exactly the agreed fields (ADR 0045) and
 * the minimum group size applied everywhere: the privacy allow-list check shared by the API's
 * tests and the contract scenarios. Values are free; the shape and the suppression rules are not.
 */
export function expectAdminStatsShape(stats: unknown, now: Date = new Date()): void {
  const root = exactly(stats, 'response', [
    'generatedAt',
    'minGroup',
    'overview',
    'features',
    'preferences',
    'ratings',
  ]);
  if (typeof root['generatedAt'] !== 'string' || !ISO_TIME.test(root['generatedAt'])) {
    fail('generatedAt', 'is not an ISO time');
  }
  if (root['minGroup'] !== ADMIN_STATS_LIMIT.MinGroup) fail('minGroup', 'is not the limit');
  const k = ADMIN_STATS_LIMIT.MinGroup;

  const overview = exactly(root['overview'], 'overview', [
    'realUsers',
    'demoSandboxes',
    'onboarded',
    'signUpsByDay',
    'signUpsByWeek',
    'active7d',
    'active30d',
    'returnedAfterWeek',
    'returnedAfterMonth',
    'activitySince',
  ]);
  const realUsers = count(overview['realUsers'], 'overview.realUsers');
  count(overview['demoSandboxes'], 'overview.demoSandboxes');
  for (const key of [
    'onboarded',
    'active7d',
    'active30d',
    'returnedAfterWeek',
    'returnedAfterMonth',
  ]) {
    rate(overview[key], `overview.${key}`, k);
  }
  points(overview['signUpsByDay'], 'overview.signUpsByDay', ADMIN_STATS_LIMIT.SignUpDays, 1);
  points(overview['signUpsByWeek'], 'overview.signUpsByWeek', ADMIN_STATS_LIMIT.SignUpWeeks, 7);
  const byDay = list(overview['signUpsByDay'], 'overview.signUpsByDay');
  const lastDay = byDay[byDay.length - 1];
  if (isObject(lastDay) && lastDay['start'] !== now.toISOString().slice(0, 10)) {
    fail('overview.signUpsByDay', 'does not end today (UTC)');
  }
  if (realUsers < k) {
    for (const key of ['signUpsByDay', 'signUpsByWeek']) {
      const shown = list(overview[key], `overview.${key}`).some(
        (point) => isObject(point) && point['count'] !== 0,
      );
      if (shown) fail(`overview.${key}`, `shows sign-ups of ${realUsers} real users`);
    }
  }
  const since = overview['activitySince'];
  if (since !== null && (typeof since !== 'string' || !DAY.test(since))) {
    fail('overview.activitySince', 'is not null or a day');
  }

  const features = exactly(root['features'], 'features', ['linksPerUser', 'adoption']);
  const links = exactly(features['linksPerUser'], 'features.linksPerUser', [
    'mean',
    'median',
    'buckets',
  ]);
  for (const field of ['mean', 'median']) {
    nullableNumber(links[field], `features.linksPerUser.${field}`, 0, Number.MAX_SAFE_INTEGER);
    if (realUsers < k && links[field] !== null) fail(`features.linksPerUser.${field}`, 'is shown');
  }
  buckets(
    links['buckets'],
    'features.linksPerUser.buckets',
    Object.values(ADMIN_STATS_LINKS_BUCKET),
    k,
  );
  const adoption = list(features['adoption'], 'features.adoption');
  const featureKeys = Object.values(ADMIN_STATS_FEATURE);
  if (adoption.length !== featureKeys.length) fail('features.adoption', 'misses features');
  for (const [i, item] of adoption.entries()) {
    const row = exactly(item, `features.adoption[${i}]`, ['feature', 'rate']);
    if (row['feature'] !== featureKeys[i]) fail(`features.adoption[${i}]`, 'is out of order');
    rate(row['rate'], `features.adoption[${i}].rate`, k);
  }

  const prefs = exactly(root['preferences'], 'preferences', [
    'theme',
    'language',
    'trashRetention',
  ]);
  buckets(
    prefs['theme'],
    'preferences.theme',
    [...Object.values(THEME_PREFERENCE), ADMIN_STATS_BUCKET_KEY.Never],
    k,
  );
  buckets(
    prefs['language'],
    'preferences.language',
    [...Object.values(INTERFACE_LANGUAGE), ADMIN_STATS_BUCKET_KEY.Never],
    k,
  );
  buckets(
    prefs['trashRetention'],
    'preferences.trashRetention',
    TRASH_RETENTION_DAYS.map(String),
    k,
  );

  const ratings = exactly(root['ratings'], 'ratings', [
    'milestones',
    'messagesByKind',
    'messagesByStatus',
  ]);
  const milestones = list(ratings['milestones'], 'ratings.milestones');
  const milestoneKeys = Object.values(FEEDBACK_MILESTONE);
  if (milestones.length !== milestoneKeys.length) fail('ratings.milestones', 'misses milestones');
  for (const [i, item] of milestones.entries()) {
    const at = `ratings.milestones[${i}]`;
    const m = exactly(item, at, ['milestone', 'answered', 'skipped', 'mean', 'median', 'groups']);
    if (m['milestone'] !== milestoneKeys[i]) fail(at, 'is out of order');
    const answered = count(m['answered'], `${at}.answered`);
    count(m['skipped'], `${at}.skipped`);
    for (const field of ['mean', 'median']) nullableNumber(m[field], `${at}.${field}`, 1, 10);
    buckets(m['groups'], `${at}.groups`, Object.values(ADMIN_STATS_SCORE_GROUP), k);
    const shown = ['mean', 'median'].filter((field) => m[field] !== null);
    if (list(m['groups'], `${at}.groups`).length > 0) shown.push('groups');
    if (answered < k && shown.length > 0) fail(at, `shows the ratings of ${answered} people`);
  }
  buckets(
    ratings['messagesByKind'],
    'ratings.messagesByKind',
    Object.values(FEEDBACK_MESSAGE_KIND),
    k,
    false,
  );
  buckets(
    ratings['messagesByStatus'],
    'ratings.messagesByStatus',
    Object.values(FEEDBACK_STATUS),
    k,
    false,
  );
}
