import { Injectable } from '@nestjs/common';
import {
  ADMIN_STATS_BUCKET_KEY,
  ADMIN_STATS_FEATURE,
  ADMIN_STATS_LIMIT,
  ADMIN_STATS_LINKS_BUCKET,
  ADMIN_STATS_SCORE_GROUP,
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MILESTONE,
  FEEDBACK_STATUS,
  FOLDER_ICON,
  INTERFACE_LANGUAGE,
  THEME_PREFERENCE,
  TRASH_RETENTION_DAYS,
  type AdminStatsAdoption,
  type AdminStatsBucket,
  type AdminStatsFeature,
  type AdminStatsMilestone,
  type AdminStatsPoint,
  type AdminStatsResponse,
} from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { readAdminEmails } from '../config/admin-config';
import { PrismaService } from '../prisma/prisma.service';
import { utcDay } from '../users/user-activity.service';
import { lastUtcDays, lastUtcWeeks } from './admin-stats-days';
import type { AdminStatsCount } from './models/admin-stats-count.interface';
import type { AdminStatsDimensionRow } from './models/admin-stats-dimension-row.interface';
import type { AdminStatsKeyCountRow } from './models/admin-stats-key-count-row.interface';
import type { AdminStatsLinksRow } from './models/admin-stats-links-row.interface';
import type { AdminStatsMilestoneRow } from './models/admin-stats-milestone-row.interface';
import { ADMIN_STATS_QUERY } from './models/admin-stats-query.const';
import type { AdminStatsTotalsRow } from './models/admin-stats-totals-row.interface';
import { STARTER_SAVED_VIEWS } from './models/starter-saved-views.const';
import { suppressSmallGroups } from './suppress-small-groups';
import { toAdminStatsRate } from './to-admin-stats-rate';

type Tx = Prisma.TransactionClient;

const DIM = { Theme: 'theme', Language: 'language', Retention: 'retention' } as const;
const MESSAGE_DIM = { Kind: 'kind', Status: 'status' } as const;

/** The totals column that counts each feature, in `ADMIN_STATS_FEATURE` order. */
const FEATURE_COLUMN: Readonly<Record<AdminStatsFeature, keyof AdminStatsTotalsRow>> = {
  [ADMIN_STATS_FEATURE.Folders]: 'folders',
  [ADMIN_STATS_FEATURE.NestedFolders]: 'nestedFolders',
  [ADMIN_STATS_FEATURE.Tags]: 'tags',
  [ADMIN_STATS_FEATURE.Favorites]: 'favorites',
  [ADMIN_STATS_FEATURE.Notes]: 'notes',
  [ADMIN_STATS_FEATURE.SidebarPins]: 'sidebarPins',
  [ADMIN_STATS_FEATURE.FolderPins]: 'folderPins',
  [ADMIN_STATS_FEATURE.SavedViews]: 'savedViews',
  [ADMIN_STATS_FEATURE.Trash]: 'trash',
  [ADMIN_STATS_FEATURE.PublicCollections]: 'publicCollections',
  [ADMIN_STATS_FEATURE.OwnColours]: 'ownColours',
  [ADMIN_STATS_FEATURE.OwnEmoji]: 'ownEmoji',
  [ADMIN_STATS_FEATURE.OpenedRecently]: 'openedRecently',
  [ADMIN_STATS_FEATURE.HistoryPaused]: 'historyPaused',
  [ADMIN_STATS_FEATURE.PreviewsOff]: 'previewsOff',
};

function round(value: number | null, digits: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** The counts of `keys` from grouped rows of one dimension; values outside the list are dropped (CHECKs keep them out). */
function countsOf(
  rows: readonly AdminStatsDimensionRow[],
  dim: string,
  keys: readonly string[],
): AdminStatsCount[] {
  const found = new Map(rows.filter((r) => r.dim === dim).map((r) => [r.key, r.count]));
  return keys.map((key) => ({ key, count: found.get(key) ?? 0 }));
}

function series(
  keys: readonly string[],
  rows: readonly AdminStatsKeyCountRow[],
): AdminStatsPoint[] {
  const found = new Map(rows.map((r) => [r.key, r.count]));
  return keys.map((start) => ({ start, count: found.get(start) ?? 0 }));
}

/**
 * `GET /api/admin/stats` (#333, ADR 0045): usage aggregates over real users, computed on request,
 * nothing stored. Real users are non-demo accounts whose email is not in `ADMIN_EMAILS`. Only
 * counts, shares, means, medians and buckets leave this service, under the minimum group size
 * (`suppressSmallGroups`, `toAdminStatsRate`); no query selects an id, name, email, URL, title,
 * note or comment into the response. One read-only transaction with a statement timeout; plain
 * SQL only through tagged templates (every value a bound parameter).
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `minGroup` is the limit of the contract; tests pass 1 to read the raw counts. */
  async stats(
    now: Date = new Date(),
    minGroup: number = ADMIN_STATS_LIMIT.MinGroup,
  ): Promise<AdminStatsResponse> {
    const K = minGroup;
    const today = utcDay(now);
    const days = lastUtcDays(now, ADMIN_STATS_LIMIT.SignUpDays);
    const weeks = lastUtcWeeks(now, ADMIN_STATS_LIMIT.SignUpWeeks);
    const real = this.realUsers();
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        await tx.$queryRaw`SELECT set_config('statement_timeout', ${String(ADMIN_STATS_QUERY.StatementTimeoutMs)}, true)`;
        const totals = await this.totals(tx, real, today, now);
        const byDay = await this.signUps(tx, real, 'day', days[0]);
        const byWeek = await this.signUps(tx, real, 'week', weeks[0]);
        const links = await this.links(tx, real);
        const prefs = await this.preferences(tx, real);
        const ratings = await this.ratings(tx, real);
        const messages = await this.messages(tx, real);
        const activitySince = await this.activitySince(tx);
        const enoughUsers = totals.realUsers >= K;
        const signUps = (keys: readonly string[], rows: readonly AdminStatsKeyCountRow[]) =>
          series(keys, enoughUsers ? rows : []);
        return {
          generatedAt: now.toISOString(),
          minGroup: K,
          overview: {
            realUsers: totals.realUsers,
            demoSandboxes: totals.demoSandboxes,
            onboarded: toAdminStatsRate(totals.realUsers, totals.onboarded, K),
            signUpsByDay: signUps(days, byDay),
            signUpsByWeek: signUps(weeks, byWeek),
            active7d: toAdminStatsRate(totals.realUsers, totals.active7d, K),
            active30d: toAdminStatsRate(totals.realUsers, totals.active30d, K),
            returnedAfterWeek: toAdminStatsRate(totals.weekBase, totals.weekReturned, K),
            returnedAfterMonth: toAdminStatsRate(totals.monthBase, totals.monthReturned, K),
            activitySince,
          },
          features: {
            linksPerUser: {
              mean: totals.realUsers < K ? null : round(links.mean, 1),
              median: totals.realUsers < K ? null : round(links.median, 1),
              buckets: suppressSmallGroups(
                [
                  { key: ADMIN_STATS_LINKS_BUCKET.None, count: links.none },
                  { key: ADMIN_STATS_LINKS_BUCKET.Few, count: links.few },
                  { key: ADMIN_STATS_LINKS_BUCKET.Some, count: links.some },
                  { key: ADMIN_STATS_LINKS_BUCKET.Many, count: links.many },
                  { key: ADMIN_STATS_LINKS_BUCKET.Lots, count: links.lots },
                ],
                K,
              ),
            },
            adoption: Object.values(ADMIN_STATS_FEATURE).map((feature): AdminStatsAdoption => ({
              feature,
              rate: toAdminStatsRate(totals.realUsers, totals[FEATURE_COLUMN[feature]], K),
            })),
          },
          preferences: {
            theme: suppressSmallGroups(
              countsOf(prefs, DIM.Theme, [
                ...Object.values(THEME_PREFERENCE),
                ADMIN_STATS_BUCKET_KEY.Never,
              ]),
              K,
            ),
            language: suppressSmallGroups(
              countsOf(prefs, DIM.Language, [
                ...Object.values(INTERFACE_LANGUAGE),
                ADMIN_STATS_BUCKET_KEY.Never,
              ]),
              K,
            ),
            trashRetention: suppressSmallGroups(
              countsOf(prefs, DIM.Retention, TRASH_RETENTION_DAYS.map(String)),
              K,
            ),
          },
          ratings: {
            milestones: Object.values(FEEDBACK_MILESTONE).map((milestone): AdminStatsMilestone => {
              const row = ratings.find((r) => r.milestone === milestone);
              const answered = row?.answered ?? 0;
              const enough = row !== undefined && answered >= K;
              return {
                milestone,
                answered,
                skipped: row?.skipped ?? 0,
                mean: enough ? round(row.mean, 1) : null,
                median: enough ? round(row.median, 1) : null,
                groups: enough
                  ? suppressSmallGroups(
                      [
                        { key: ADMIN_STATS_SCORE_GROUP.Low, count: row.low },
                        { key: ADMIN_STATS_SCORE_GROUP.Mid, count: row.mid },
                        { key: ADMIN_STATS_SCORE_GROUP.High, count: row.high },
                      ],
                      K,
                    )
                  : [],
              };
            }),
            messagesByKind: this.plain(
              messages,
              MESSAGE_DIM.Kind,
              Object.values(FEEDBACK_MESSAGE_KIND),
            ),
            messagesByStatus: this.plain(
              messages,
              MESSAGE_DIM.Status,
              Object.values(FEEDBACK_STATUS),
            ),
          },
        };
      },
      { timeout: ADMIN_STATS_QUERY.TransactionTimeoutMs },
    );
  }

  /** Real users: not demo, email not in `ADMIN_EMAILS` (compared lower-cased, like `AdminGuard`). */
  private realUsers(): Prisma.Sql {
    const admins = [...readAdminEmails()];
    return Prisma.sql`real AS (
      SELECT u.* FROM users u
      WHERE u.is_demo = false AND lower(btrim(u.email)) <> ALL(${admins}::text[])
    )`;
  }

  private plain(
    rows: readonly AdminStatsDimensionRow[],
    dim: string,
    keys: readonly string[],
  ): AdminStatsBucket[] {
    return countsOf(rows, dim, keys);
  }

  private async totals(
    tx: Tx,
    real: Prisma.Sql,
    today: string,
    now: Date,
  ): Promise<AdminStatsTotalsRow> {
    const icons: string[] = Object.values(FOLDER_ICON);
    const [videos, articles] = STARTER_SAVED_VIEWS;
    const openedSince = new Date(now.getTime() - ADMIN_STATS_QUERY.OpenedRecentlyDays * 86_400_000);
    const rows = await tx.$queryRaw<AdminStatsTotalsRow[]>`
      WITH ${real}, t AS (SELECT ${today}::date AS d)
      SELECT
        count(*)::int AS "realUsers",
        (SELECT count(*)::int FROM users WHERE is_demo) AS "demoSandboxes",
        count(*) FILTER (WHERE r.onboarding_completed_at IS NOT NULL)::int AS "onboarded",
        count(*) FILTER (WHERE r.last_active_on >= t.d - 6)::int AS "active7d",
        count(*) FILTER (WHERE r.last_active_on >= t.d - 29)::int AS "active30d",
        count(*) FILTER (WHERE (r.created_at AT TIME ZONE 'UTC')::date <= t.d - 7)::int AS "weekBase",
        count(*) FILTER (WHERE (r.created_at AT TIME ZONE 'UTC')::date <= t.d - 7
          AND r.last_active_on >= (r.created_at AT TIME ZONE 'UTC')::date + 7)::int AS "weekReturned",
        count(*) FILTER (WHERE (r.created_at AT TIME ZONE 'UTC')::date <= t.d - 30)::int AS "monthBase",
        count(*) FILTER (WHERE (r.created_at AT TIME ZONE 'UTC')::date <= t.d - 30
          AND r.last_active_on >= (r.created_at AT TIME ZONE 'UTC')::date + 30)::int AS "monthReturned",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM folders f
          WHERE f.user_id = r.id AND f.deleted_at IS NULL))::int AS "folders",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM folders f
          WHERE f.user_id = r.id AND f.deleted_at IS NULL AND f.parent_id IS NOT NULL))::int AS "nestedFolders",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM link_tags lt JOIN links l ON l.id = lt.link_id
          WHERE l.user_id = r.id AND l.deleted_at IS NULL))::int AS "tags",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM links l
          WHERE l.user_id = r.id AND l.deleted_at IS NULL AND l.is_favorite))::int AS "favorites",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM links l
          WHERE l.user_id = r.id AND l.deleted_at IS NULL AND l.note IS NOT NULL
            AND btrim(l.note) <> ''))::int AS "notes",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM folders f
            WHERE f.user_id = r.id AND f.deleted_at IS NULL AND f.pinned_position IS NOT NULL)
          OR EXISTS (SELECT 1 FROM links l
            WHERE l.user_id = r.id AND l.deleted_at IS NULL AND l.pinned_position IS NOT NULL))::int AS "sidebarPins",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM links l
          WHERE l.user_id = r.id AND l.deleted_at IS NULL AND l.pinned_in_folder_at IS NOT NULL))::int AS "folderPins",
        count(*) FILTER (WHERE (SELECT count(*) FROM saved_views v WHERE v.user_id = r.id) <> ${STARTER_SAVED_VIEWS.length}
          OR EXISTS (SELECT 1 FROM saved_views v WHERE v.user_id = r.id
            AND NOT ((v.name = ${videos.name} AND v.query = ${videos.query}::jsonb)
              OR (v.name = ${articles.name} AND v.query = ${articles.query}::jsonb))))::int AS "savedViews",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM links l
            WHERE l.user_id = r.id AND l.deleted_at IS NOT NULL)
          OR EXISTS (SELECT 1 FROM folders f
            WHERE f.user_id = r.id AND f.deleted_at IS NOT NULL))::int AS "trash",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM folder_shares s
          WHERE s.user_id = r.id))::int AS "publicCollections",
        count(*) FILTER (WHERE cardinality(r.custom_colours) > 0
          OR EXISTS (SELECT 1 FROM folders f
            WHERE f.user_id = r.id AND f.deleted_at IS NULL AND f.colour LIKE '#%'))::int AS "ownColours",
        count(*) FILTER (WHERE cardinality(r.custom_emoji) > 0
          OR EXISTS (SELECT 1 FROM folders f
            WHERE f.user_id = r.id AND f.deleted_at IS NULL AND NOT (f.icon = ANY(${icons}::text[]))))::int AS "ownEmoji",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM links l
          WHERE l.user_id = r.id AND l.deleted_at IS NULL
            AND l.last_opened_at >= ${openedSince}::timestamptz))::int AS "openedRecently",
        count(*) FILTER (WHERE r.history_paused)::int AS "historyPaused",
        count(*) FILTER (WHERE NOT r.fetch_previews)::int AS "previewsOff"
      FROM real r CROSS JOIN t`;
    return rows[0];
  }

  private signUps(
    tx: Tx,
    real: Prisma.Sql,
    unit: 'day' | 'week',
    from: string,
  ): Promise<AdminStatsKeyCountRow[]> {
    const bucket =
      unit === 'day'
        ? Prisma.sql`(r.created_at AT TIME ZONE 'UTC')::date`
        : Prisma.sql`date_trunc('week', r.created_at AT TIME ZONE 'UTC')::date`;
    return tx.$queryRaw<AdminStatsKeyCountRow[]>`
      WITH ${real}
      SELECT to_char(${bucket}, 'YYYY-MM-DD') AS key, count(*)::int AS count
      FROM real r
      WHERE r.created_at >= ${`${from}T00:00:00Z`}::timestamptz
      GROUP BY 1`;
  }

  private async links(tx: Tx, real: Prisma.Sql): Promise<AdminStatsLinksRow> {
    const rows = await tx.$queryRaw<AdminStatsLinksRow[]>`
      WITH ${real}, per AS (
        SELECT r.id, count(l.id)::int AS n
        FROM real r LEFT JOIN links l ON l.user_id = r.id AND l.deleted_at IS NULL
        GROUP BY r.id
      )
      SELECT
        avg(n)::float8 AS mean,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY n)::float8 AS median,
        count(*) FILTER (WHERE n = 0)::int AS none,
        count(*) FILTER (WHERE n BETWEEN 1 AND 9)::int AS few,
        count(*) FILTER (WHERE n BETWEEN 10 AND 49)::int AS some,
        count(*) FILTER (WHERE n BETWEEN 50 AND 99)::int AS many,
        count(*) FILTER (WHERE n >= 100)::int AS lots
      FROM per`;
    return rows[0];
  }

  private preferences(tx: Tx, real: Prisma.Sql): Promise<AdminStatsDimensionRow[]> {
    return tx.$queryRaw<AdminStatsDimensionRow[]>`
      WITH ${real}
      SELECT ${DIM.Theme}::text AS dim,
        CASE WHEN r.appearance_saved_at IS NULL THEN ${ADMIN_STATS_BUCKET_KEY.Never}::text ELSE r.theme END AS key,
        count(*)::int AS count
      FROM real r GROUP BY 2
      UNION ALL
      SELECT ${DIM.Language}::text,
        CASE WHEN r.language_saved_at IS NULL THEN ${ADMIN_STATS_BUCKET_KEY.Never}::text ELSE r.language END,
        count(*)::int
      FROM real r GROUP BY 2
      UNION ALL
      SELECT ${DIM.Retention}::text, r.trash_retention_days::text, count(*)::int
      FROM real r GROUP BY 2`;
  }

  private ratings(tx: Tx, real: Prisma.Sql): Promise<AdminStatsMilestoneRow[]> {
    return tx.$queryRaw<AdminStatsMilestoneRow[]>`
      WITH ${real}
      SELECT f.milestone,
        count(*) FILTER (WHERE f.score IS NOT NULL)::int AS answered,
        count(*) FILTER (WHERE f.score IS NULL)::int AS skipped,
        avg(f.score)::float8 AS mean,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY f.score)::float8 AS median,
        count(*) FILTER (WHERE f.score BETWEEN 1 AND 6)::int AS low,
        count(*) FILTER (WHERE f.score BETWEEN 7 AND 8)::int AS mid,
        count(*) FILTER (WHERE f.score BETWEEN 9 AND 10)::int AS high
      FROM feedback f JOIN real r ON r.id = f.user_id
      WHERE f.kind IS NULL AND f.milestone IS NOT NULL
      GROUP BY f.milestone`;
  }

  private messages(tx: Tx, real: Prisma.Sql): Promise<AdminStatsDimensionRow[]> {
    return tx.$queryRaw<AdminStatsDimensionRow[]>`
      WITH ${real}
      SELECT ${MESSAGE_DIM.Kind}::text AS dim, f.kind AS key, count(*)::int AS count
      FROM feedback f JOIN real r ON r.id = f.user_id
      WHERE f.kind IS NOT NULL GROUP BY 2
      UNION ALL
      SELECT ${MESSAGE_DIM.Status}::text, f.status, count(*)::int
      FROM feedback f JOIN real r ON r.id = f.user_id
      WHERE f.kind IS NOT NULL GROUP BY 2`;
  }

  /** The UTC day the activity migration was applied; `null` without Prisma's migrations table (tests). */
  private async activitySince(tx: Tx): Promise<string | null> {
    const [table] = await tx.$queryRaw<{ ok: boolean }[]>`
      SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS ok`;
    if (!table?.ok) return null;
    const [row] = await tx.$queryRaw<{ day: string | null }[]>`
      SELECT to_char(min(finished_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
      FROM _prisma_migrations
      WHERE migration_name = ${ADMIN_STATS_QUERY.ActivityMigration} AND finished_at IS NOT NULL`;
    return row?.day ?? null;
  }
}
