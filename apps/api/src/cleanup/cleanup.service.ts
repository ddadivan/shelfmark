import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_SEARCH_STATE,
  AI_TIER,
  CLEANUP_ERROR_MESSAGE,
  CLEANUP_STATE,
  type AuthUser,
  type CleanupDuplicateGroup,
  type CleanupReport,
  type CleanupState,
  type CleanupTag,
  type CleanupTagPair,
} from '@shelfmark/contracts';
import { AiSearchStatusService } from '../ai/embeddings/ai-search-status.service';
import { AiProviderRegistry } from '../ai/providers/ai-provider.registry';
import { AiSettingsService } from '../ai/settings/ai-settings.service';
import { AiUsageService } from '../ai/usage/ai-usage.service';
import { LINK_INCLUDE } from '../links/models/link-include.const';
import { toLinkResponse } from '../links/to-link-response';
import { PrismaService } from '../prisma/prisma.service';
import { loadTagUsage } from './checks/load-tag-usage';
import { CLEANUP_CHECKS } from './models/cleanup-checks.token';
import { CLEANUP_RUN_LIMIT } from './models/cleanup-run-limit.const';
import type { CleanupAiAccess } from './models/cleanup-ai-access.interface';
import type { CleanupCheck } from './models/cleanup-check.interface';
import type { CleanupDbClient } from './models/cleanup-db-client.type';
import type { CleanupReportRow } from './models/cleanup-report-row.interface';
import type { StoredCleanupFindings } from './models/stored-cleanup-findings.interface';
import { CleanupRunnerService } from './cleanup-runner.service';
import { pickKeep } from './pick-keep';
import { toCleanupState } from './to-cleanup-state';
import { emptyFindings, readStoredFindings, toFindingsJson } from './read-stored-findings';

const REPORT_SELECT = {
  state: true,
  includeAi: true,
  checked: true,
  total: true,
  cursor: true,
  findings: true,
  startedAt: true,
  progressAt: true,
  appliedAt: true,
  cardDismissedAt: true,
} as const;

const HOUR_MS = 3_600_000;

/** Whether a `running` report stalled past `StallHours` (it no longer blocks a run). */
export function isStalled(row: Pick<CleanupReportRow, 'progressAt'>, now: Date): boolean {
  return (
    row.progressAt === null ||
    now.getTime() - row.progressAt.getTime() > CLEANUP_RUN_LIMIT.StallHours * HOUR_MS
  );
}

/**
 * Library clean-up (F5, ADR 0052): the stored report, read live, and new runs. Rule checks run in the
 * request; AI checks need AI on, the AI pack and a clean-up run left this month. The report holds ids
 * only; titles and names are joined live here, so trashed links and deleted tags drop out. Every
 * query is on the session user's rows.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly usage: AiUsageService,
    private readonly searchStatus: AiSearchStatusService,
    private readonly registry: AiProviderRegistry,
    private readonly runner: CleanupRunnerService,
    @Inject(CLEANUP_CHECKS) private readonly checks: readonly CleanupCheck[],
  ) {}

  /** `GET /api/cleanup`. */
  async report(userId: string, now: Date = new Date()): Promise<CleanupReport> {
    const [row, access] = await Promise.all([
      this.prisma.cleanupReport.findUnique({ where: { userId }, select: REPORT_SELECT }),
      this.aiAccess(userId, now),
    ]);
    return this.toReport(userId, row, access.available);
  }

  /**
   * `POST /api/cleanup/run`: replaces the report. Rule checks run now; with `includeAi` and access,
   * one AI clean-up run is counted and the AI checks are left `pending` for the deferred pass. A
   * report still running (and not stalled) is a 409.
   */
  async run(
    user: Pick<AuthUser, 'id' | 'isDemo'>,
    includeAi: boolean,
    now: Date = new Date(),
  ): Promise<CleanupReport> {
    const userId = user.id;
    const started = Date.now();
    const access = await this.aiAccess(userId, now);
    const aiChecks = this.checks.filter(
      (check) => check.needsAi && (access.vectorsReady || !check.needsVectors),
    );
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO cleanup_reports (user_id) VALUES (${userId}::uuid)
        ON CONFLICT (user_id) DO NOTHING`;
      const [current] = await tx.$queryRaw<Pick<CleanupReportRow, 'state' | 'progressAt'>[]>`
        SELECT state, progress_at AS "progressAt" FROM cleanup_reports
        WHERE user_id = ${userId}::uuid FOR UPDATE`;
      if (current?.state === CLEANUP_STATE.Running && !isStalled(current, now)) {
        throw new ConflictException(CLEANUP_ERROR_MESSAGE.Running);
      }
      const findings = emptyFindings();
      for (const check of this.checks.filter((entry) => !entry.needsAi)) {
        await check.run(
          { db: tx, userId, isDemo: user.isDemo, findings, cursor: null, checked: 0 },
          Number.POSITIVE_INFINITY,
        );
      }
      const withAi =
        includeAi &&
        access.available &&
        aiChecks.length > 0 &&
        (await this.usage.reserveCleanupRun(userId, access.tier, now, tx)) !== null;
      if (withAi) findings.pending = aiChecks.map((check) => check.key);
      const total =
        withAi && access.vectorsReady
          ? await this.vectorTotal(tx, userId, this.registry.embeddingsFor(user).model)
          : 0;
      await this.store(tx, userId, findings, {
        state: withAi ? CLEANUP_STATE.Running : CLEANUP_STATE.Ready,
        includeAi: withAi,
        total,
        now,
      });
      return { withAi };
    });
    this.logger.log(`Clean-up run: ai=${result.withAi}, ${Date.now() - started} ms`);
    if (result.withAi) this.runner.start(userId);
    return this.report(userId, now);
  }

  /** The state of the user's report (`none` without a row). */
  async state(userId: string): Promise<CleanupState> {
    const row = await this.prisma.cleanupReport.findUnique({
      where: { userId },
      select: { state: true },
    });
    return toCleanupState(row?.state);
  }

  /** Whether AI checks may run now (AI on, AI pack, a run left) and whether vectors are ready. */
  async aiAccess(userId: string, now: Date = new Date()): Promise<CleanupAiAccess> {
    const [entitlements, stored] = await Promise.all([
      this.settings.entitlements(this.prisma, userId),
      this.settings.read(this.prisma, userId),
    ]);
    const tier = entitlements.aiTier;
    if (!stored.settings.enabled || tier !== AI_TIER.AiPack) {
      return { available: false, tier, vectorsReady: false };
    }
    const [runsLeft, status] = await Promise.all([
      this.usage.cleanupRunsLeft(userId, tier, now),
      this.searchStatus.status(userId, stored, tier),
    ]);
    return {
      available: runsLeft > 0,
      tier,
      vectorsReady: status.state === AI_SEARCH_STATE.Ready,
    };
  }

  /** Live links of the user with a vector of the current model (the denominator of the progress). */
  private async vectorTotal(db: CleanupDbClient, userId: string, model: string): Promise<number> {
    const [row] = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM link_embeddings e
      JOIN links l ON l.id = e.link_id AND l.user_id = e.user_id
      WHERE e.user_id = ${userId}::uuid AND e.model = ${model} AND l.deleted_at IS NULL`;
    return row?.n ?? 0;
  }

  private async store(
    db: CleanupDbClient,
    userId: string,
    findings: StoredCleanupFindings,
    run: { state: CleanupState; includeAi: boolean; total: number; now: Date },
  ): Promise<void> {
    const finished = run.state === CLEANUP_STATE.Running ? null : run.now;
    await db.cleanupReport.update({
      where: { userId },
      data: {
        state: run.state,
        includeAi: run.includeAi,
        checked: 0,
        total: run.total,
        cursor: null,
        leaseUntil: null,
        findings: toFindingsJson(findings),
        startedAt: run.now,
        progressAt: run.now,
        finishedAt: finished,
        appliedAt: null,
      },
    });
  }

  /** The report with live links and tags; groups with fewer than two live members drop out. */
  private async toReport(
    userId: string,
    row: CleanupReportRow | null,
    aiAvailable: boolean,
  ): Promise<CleanupReport> {
    if (row === null) {
      return {
        state: CLEANUP_STATE.None,
        checked: 0,
        total: 0,
        checkedAt: null,
        aiIncluded: false,
        aiAvailable,
        duplicates: [],
        similarTags: [],
      };
    }
    const findings = readStoredFindings(row.findings);
    const [duplicates, similarTags] = await Promise.all([
      this.liveDuplicates(userId, findings),
      this.liveTagPairs(userId, findings),
    ]);
    return {
      state: toCleanupState(row.state),
      checked: Math.min(row.checked, row.total),
      total: row.total,
      checkedAt: row.startedAt?.toISOString() ?? null,
      aiIncluded: row.includeAi,
      aiAvailable,
      duplicates,
      similarTags,
    };
  }

  private async liveDuplicates(
    userId: string,
    findings: StoredCleanupFindings,
  ): Promise<CleanupDuplicateGroup[]> {
    const ids = [...new Set(findings.duplicates.flatMap((group) => group.linkIds))];
    if (ids.length === 0) return [];
    const now = new Date();
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: ids } },
      include: LINK_INCLUDE,
    });
    const folderIds = [...new Set(rows.flatMap((link) => link.folderId ?? []))];
    const liveFolders = new Set(
      (
        await this.prisma.folder.findMany({
          where: { userId, deletedAt: null, id: { in: folderIds } },
          select: { id: true },
        })
      ).map((folder) => folder.id),
    );
    const byId = new Map(rows.map((link) => [link.id, link]));
    return findings.duplicates.flatMap((group) => {
      const members = group.linkIds.flatMap((id) => byId.get(id) ?? []);
      const choice = pickKeep(
        members.map((link) => ({
          id: link.id,
          inFolder: link.folderId !== null && liveFolders.has(link.folderId),
          hasNote: (link.note ?? '').trim() !== '',
          hasReminder: link.remindAt !== null && link.remindAt > now,
          tagCount: link.tags.length,
          isFavorite: link.isFavorite,
          lastOpenedAt: link.lastOpenedAt,
          createdAt: link.createdAt,
        })),
      );
      const keep = members.find((link) => link.id === choice?.keepId);
      if (members.length < 2 || choice === null || keep === undefined) return [];
      return [
        {
          id: group.id,
          reason: group.reason,
          source: group.source,
          keep: toLinkResponse(keep),
          keepReason: choice.reason,
          copies: members.filter((link) => link !== keep).map(toLinkResponse),
        },
      ];
    });
  }

  private async liveTagPairs(
    userId: string,
    findings: StoredCleanupFindings,
  ): Promise<CleanupTagPair[]> {
    if (findings.similarTags.length === 0) return [];
    const tags = new Map<string, CleanupTag>(
      (await loadTagUsage(this.prisma, userId)).map((tag) => [tag.id, tag]),
    );
    return findings.similarTags.flatMap((pair) => {
      const first = tags.get(pair.tagIds[0]);
      const second = tags.get(pair.tagIds[1]);
      if (first === undefined || second === undefined) return [];
      // The tag on more live links is kept; on a tie the stored suggestion stays.
      const [keep, merge] = second.links > first.links ? [second, first] : [first, second];
      return [{ id: pair.id, source: pair.source, keep, merge }];
    });
  }
}
