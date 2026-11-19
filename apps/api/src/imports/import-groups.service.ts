import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  AI_QUOTA,
  FOLDER_LIMIT,
  IMPORT_ERROR_MESSAGE,
  type AuthUser,
  type ImportGroup,
  type ImportGroupsRequest,
  type ImportGroupsResponse,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { mapLimit } from '../ai/backfill/map-limit';
import { AiJobsService } from '../ai/jobs/ai-jobs.service';
import { EMBEDDING_INPUT_TYPE } from '../ai/models/embedding-input-type.const';
import { EMBEDDING_LIMIT } from '../ai/models/embedding-limit.const';
import type { ImportGroupNamesGroup } from '../ai/models/import-group-names-group.interface';
import type { AiRequestContext } from '../ai/models/ai-request-context.interface';
import type { StoredAiSettings } from '../ai/models/stored-ai-settings.interface';
import { fallbackImportGroupName } from '../ai/prompt/fallback-import-group-name';
import { parseImportGroupNamesOutput } from '../ai/prompt/parse-import-group-names-output';
import { AiProviderRegistry } from '../ai/providers/ai-provider.registry';
import { AiSettingsService } from '../ai/settings/ai-settings.service';
import { AiUsageService } from '../ai/usage/ai-usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { clusterVectors } from './grouping/cluster-vectors';
import { importGroupCount } from './grouping/import-group-count';
import { importGroupText, importUrlLocation } from './grouping/import-group-text';
import { normalizeFolderKey } from './grouping/normalize-folder-key';
import { IMPORT_GROUPING_LIMIT } from './models/import-grouping-limit.const';

/** The most frequent hosts of `urls`, at most `max`; ties alphabetical. */
function topHosts(urls: readonly string[], max: number): string[] {
  const counts = new Map<string, number>();
  for (const url of urls) {
    const { host } = importUrlLocation(url);
    if (host !== '') counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
    .slice(0, max)
    .map(([host]) => host);
}

/**
 * AI groups by topic for the links of a file (#387, ADR 0056 decision 10). Nothing is written except
 * the allowance: N links count against the monthly grouping cap (never given back except on a
 * provider failure) and N units of the one-time backfill allowance are taken all or nothing (units
 * of an earlier grouping that no import used are given back first, `ai_settings.import_ai_prepaid`,
 * guarded by the grouping token `import_ai_grouping_id`), the
 * texts are embedded through the embedding seam (not stored, not counted as monthly embeds),
 * clustered (`clusterVectors`), the clusters named by the fast model in the user's language and
 * matched to the user's own live folders by name. A provider failure gives the units back (503).
 * Every query filters by the session `userId`; logs carry counts only, never titles, URLs or names.
 */
@Injectable()
export class ImportGroupsService {
  private readonly logger = new Logger(ImportGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly usage: AiUsageService,
    private readonly registry: AiProviderRegistry,
    private readonly jobs: AiJobsService,
  ) {}

  async group(
    user: AuthUser,
    request: ImportGroupsRequest,
    context: AiRequestContext,
  ): Promise<ImportGroupsResponse> {
    const userId = user.id;
    const charged = request.links.length;
    const stored = await this.settings.read(this.prisma, userId);
    const { token, month } = await this.reserve(userId, charged);
    try {
      const { groups, rest } = await this.compute(user, request, stored, context);
      // Counts only (no titles, URLs or names).
      this.logger.log(`Import grouping: ${charged} links, ${groups.length} groups`);
      return { groups, rest, charged };
    } catch (error) {
      await this.release(userId, token, month, charged);
      this.logger.warn(
        `Import grouping failed (${error instanceof Error ? error.name : 'unknown'}), ${charged} units given back`,
      );
      throw error;
    }
  }

  /**
   * `DELETE /api/imports/groups`: gives back the units of the user's pending grouping (no import
   * took them: Back, another choice, dialog closed) and clears its token. Idempotent. The monthly
   * count stays (it bounds provider spend).
   */
  async discard(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.giveBackPending(tx, userId);
    });
  }

  /**
   * Gives back the pending grouping units under the caller's lock on the settings row and clears
   * them with their token.
   */
  private async giveBackPending(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.$executeRaw`
      UPDATE ai_settings
      SET backfill_used = GREATEST(backfill_used - import_ai_prepaid, 0), import_ai_prepaid = 0,
        import_ai_grouping_id = NULL, import_ai_prepaid_at = NULL
      WHERE user_id = ${userId}::uuid AND import_ai_prepaid > 0`;
  }

  /**
   * Takes this grouping's units, all or nothing, in one transaction under the settings row lock:
   * the units an earlier grouping left are given back first, then `wanted` links count against the
   * monthly cap (409 `GroupsMonthly`, checked before the allowance), then `wanted` units of the
   * backfill allowance (409 `AiAllowance`); a refusal rolls everything back. The units carry a new
   * token. 409 `AiUnavailable` when AI is off or the tier has no allowance.
   */
  private async reserve(userId: string, wanted: number): Promise<{ token: string; month: string }> {
    const token = randomUUID();
    const month = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ enabled: boolean }[]>`
        SELECT enabled FROM ai_settings WHERE user_id = ${userId}::uuid FOR UPDATE`;
      const row = rows[0];
      if (row === undefined || !row.enabled) {
        throw new ConflictException(IMPORT_ERROR_MESSAGE.AiUnavailable);
      }
      const { aiTier } = await this.settings.entitlements(tx, userId);
      if (AI_QUOTA[aiTier].backfillLinks <= 0 || AI_QUOTA[aiTier].importGroupLinksPerMonth <= 0) {
        throw new ConflictException(IMPORT_ERROR_MESSAGE.AiUnavailable);
      }
      await this.giveBackPending(tx, userId);
      const reserved = await this.usage.reserveImportGroupLinks(
        userId,
        aiTier,
        wanted,
        new Date(),
        tx,
      );
      if (reserved === null) throw new ConflictException(IMPORT_ERROR_MESSAGE.GroupsMonthly);
      const granted = await this.usage.reserveBackfill(userId, aiTier, wanted, tx);
      if (granted < wanted) throw new ConflictException(IMPORT_ERROR_MESSAGE.AiAllowance);
      await tx.$executeRaw`
        UPDATE ai_settings
        SET import_ai_prepaid = ${wanted}::int, import_ai_grouping_id = ${token}::uuid,
          import_ai_prepaid_at = now()
        WHERE user_id = ${userId}::uuid`;
      return reserved;
    });
    return { token, month };
  }

  /**
   * After a provider failure: the monthly count of this request always goes back; the backfill
   * units only while they are still this grouping's (token match): a newer grouping, or an import
   * that took them over, keeps its own.
   */
  private async release(
    userId: string,
    token: string,
    month: string,
    units: number,
  ): Promise<void> {
    await this.usage.refundImportGroupLinks(userId, month, units);
    await this.prisma.$executeRaw`
      UPDATE ai_settings
      SET backfill_used = GREATEST(backfill_used - import_ai_prepaid, 0), import_ai_prepaid = 0,
        import_ai_grouping_id = NULL, import_ai_prepaid_at = NULL
      WHERE user_id = ${userId}::uuid AND import_ai_grouping_id = ${token}::uuid`;
  }

  private async compute(
    user: AuthUser,
    request: ImportGroupsRequest,
    stored: StoredAiSettings,
    context: AiRequestContext,
  ): Promise<{ groups: ImportGroup[]; rest: number[] }> {
    const embedder = this.registry.embeddingsFor(user);
    const texts = request.links.map((link) => importGroupText(link));
    const batches: string[][] = [];
    for (let at = 0; at < texts.length; at += EMBEDDING_LIMIT.BatchMax) {
      batches.push(texts.slice(at, at + EMBEDDING_LIMIT.BatchMax));
    }
    const answers = await mapLimit(batches, IMPORT_GROUPING_LIMIT.EmbedConcurrency, (batch) =>
      embedder.embed(batch, EMBEDDING_INPUT_TYPE.Document),
    );
    const vectors: number[][] = [];
    for (const [index, answer] of answers.entries()) {
      if (!answer.ok || answer.vectors.length !== batches[index]?.length) {
        throw new ServiceUnavailableException(IMPORT_ERROR_MESSAGE.AiFailed);
      }
      vectors.push(...answer.vectors);
    }
    const { clusters, rest } = clusterVectors(vectors, {
      k: importGroupCount(request.links.length),
      minSize: IMPORT_GROUPING_LIMIT.MinGroupSize,
      floor: embedder.minSimilarity,
      maxIterations: IMPORT_GROUPING_LIMIT.MaxIterations,
    });
    if (clusters.length === 0) return { groups: [], rest };

    const samples = clusters.map((cluster, index): ImportGroupNamesGroup => {
      const members = cluster.closest.flatMap((at) => {
        const link = request.links[at];
        return link === undefined ? [] : [link];
      });
      return {
        key: `g${index + 1}`,
        titles: members
          .slice(0, IMPORT_GROUPING_LIMIT.SampleTitlesMax)
          .map((link) =>
            Array.from(link.title).slice(0, IMPORT_GROUPING_LIMIT.SampleTitleMax).join(''),
          ),
        hosts: topHosts(
          members.map((link) => link.url),
          IMPORT_GROUPING_LIMIT.SampleHostsMax,
        ),
      };
    });
    const outcome = await this.registry.for(user).nameImportGroups({
      language: await this.jobs.language(this.prisma, user.id, stored, context),
      folderNames: request.folderNames,
      groups: samples,
    });
    if (outcome.type !== 'output')
      throw new ServiceUnavailableException(IMPORT_ERROR_MESSAGE.AiFailed);
    const named = parseImportGroupNamesOutput(outcome.output, new Set(samples.map((s) => s.key)));
    const names = this.distinctNames(samples, named);
    const folderIds = await this.liveFolderIds(user.id);
    const groups = clusters.map((cluster, index): ImportGroup => {
      const name = names[index] ?? '';
      return {
        key: `g${index + 1}`,
        name,
        folderId: folderIds.get(normalizeFolderKey(name)) ?? null,
        linkIndexes: cluster.indexes,
      };
    });
    return { groups, rest };
  }

  /**
   * One name per cluster: the model's, else one from the cluster's own words; a name another
   * cluster already has (case and accents ignored) gets the fallback, then a number.
   */
  private distinctNames(
    samples: readonly ImportGroupNamesGroup[],
    named: ReadonlyMap<string, string>,
  ): string[] {
    const taken = new Set<string>();
    return samples.map((sample) => {
      const candidates = [
        named.get(sample.key),
        fallbackImportGroupName(sample.titles, sample.hosts),
      ];
      for (const candidate of candidates) {
        if (candidate !== undefined && !taken.has(normalizeFolderKey(candidate))) {
          taken.add(normalizeFolderKey(candidate));
          return candidate;
        }
      }
      const base = candidates[1] ?? '';
      for (let n = 2; ; n += 1) {
        const suffix = ` ${n}`;
        const name = `${Array.from(base)
          .slice(0, FOLDER_LIMIT.NameMax - suffix.length)
          .join('')}${suffix}`;
        if (!taken.has(normalizeFolderKey(name))) {
          taken.add(normalizeFolderKey(name));
          return name;
        }
      }
    });
  }

  /** The user's live folders by comparison key; the oldest wins when two share a name. */
  private async liveFolderIds(userId: string): Promise<Map<string, string>> {
    const folders = await this.prisma.folder.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    });
    const ids = new Map<string, string>();
    for (const folder of folders) {
      const key = normalizeFolderKey(folder.name);
      if (!ids.has(key)) ids.set(key, folder.id);
    }
    return ids;
  }
}
