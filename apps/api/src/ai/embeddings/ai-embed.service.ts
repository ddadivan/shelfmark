import { Injectable, Logger } from '@nestjs/common';
import type { AiTier } from '@shelfmark/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TagChangeHooks } from '../../tags/tag-change-hooks.service';
import { AiBackgroundService } from '../background/ai-background.service';
import { AI_EMBED_LIMIT } from '../models/ai-embed-limit.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { EMBED_CHUNK_RESULT } from '../models/embed-chunk-result.const';
import { EMBEDDING_INPUT_TYPE } from '../models/embedding-input-type.const';
import type { EmbedCandidate } from '../models/embed-candidate.interface';
import type { EmbedSnapshot } from '../models/embed-snapshot.interface';
import type { EmbedPassCounts as PassCounts } from '../models/embed-pass-counts.interface';
import type { EmbedChunkResult } from '../models/embed-chunk-result.type';
import type { EmbeddingProvider } from '../models/embedding-provider.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { readAiFullAccessEmails } from '../config/ai-full-access-config';
import { aiEntitlements } from '../settings/ai-entitlements';
import { AiUsageService } from '../usage/ai-usage.service';
import { AiSearchStatusService } from './ai-search-status.service';
import { buildEmbeddingText, embeddingTextHash } from './build-embedding-text';
import { toVectorLiteral } from './embedding-sql';

/**
 * The embed pass (ADR 0052 point 4): no job rows; per user it works on the derived set of live links
 * without a current vector (none, `stale`, another model, or built with the other note setting),
 * newest first, in chunks of `AI_EMBED_LIMIT.ChunkSize`, skipping links whose link job is still
 * pending (the summary is on the way; the runner starts the pass after it). An unchanged text only
 * clears `stale`; the rest is counted against the monthly embeddings, sent to the provider outside
 * any transaction and upserted only for links that are still the user's and live. A per-user lease
 * on `ai_settings` keeps passes from overlapping; a failure backs off. Every query filters by the
 * user; logs carry counts only, never texts or vectors.
 */
@Injectable()
export class AiEmbedService {
  private readonly logger = new Logger(AiEmbedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiProviderRegistry,
    private readonly usage: AiUsageService,
    private readonly status: AiSearchStatusService,
    private readonly background: AiBackgroundService,
    tagHooks: TagChangeHooks,
  ) {
    // A tag rename, delete or merge flags vectors stale in `TagsModule`, which cannot import this
    // module: it tells us through the seam, and the pass starts after the response.
    tagHooks.onLinksChanged((userId) => this.kick(userId));
  }

  /**
   * Starts a pass after the response when the user has AI and search by meaning on (one cheap read
   * in the request; never throws into it).
   */
  async kick(userId: string): Promise<void> {
    try {
      const on = await this.prisma.aiSettings.findFirst({
        where: { userId, enabled: true, meaningSearch: true },
        select: { userId: true },
      });
      if (on) this.background.defer(() => this.run(userId, AI_EMBED_LIMIT.KickBudgetMs));
    } catch (error) {
      this.logger.warn(`Embed kick failed (${error instanceof Error ? error.name : 'unknown'})`);
    }
  }

  /** One pass for the user within `budgetMs` (a new chunk starts only while time is left). */
  async run(userId: string, budgetMs: number): Promise<void> {
    if (budgetMs <= 0) return;
    const deadline = Date.now() + budgetMs;
    const lease = await this.claim(userId);
    if (lease === null) return;
    const { includeNotes } = lease;
    let leaseUntil = lease.until;
    const counts: PassCounts = { embedded: 0, unchanged: 0, calls: 0 };
    let result: EmbedChunkResult = EMBED_CHUNK_RESULT.More;
    try {
      const account = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true, isDemo: true, plan: true, aiPack: true },
      });
      if (!account) return;
      const provider = this.registry.embeddingsFor(account);
      const { aiTier } = aiEntitlements(account, readAiFullAccessEmails());
      while (result === EMBED_CHUNK_RESULT.More && Date.now() < deadline) {
        result = await this.chunk(userId, provider, aiTier, includeNotes, counts);
        if (result !== EMBED_CHUNK_RESULT.More) break;
        const renewed = await this.renew(userId, leaseUntil);
        if (renewed === null) break;
        leaseUntil = renewed;
      }
    } finally {
      await this.release(userId, leaseUntil);
      if (counts.calls > 0 || counts.unchanged > 0) {
        this.logger.log(
          `Embed pass: ${counts.embedded} embedded, ${counts.unchanged} unchanged, ${counts.calls} call(s), ${result}`,
        );
      }
    }
  }

  /**
   * Users with AI and search by meaning on and at least one live link without a current vector (the
   * daily sweep; the only embedding query across users).
   */
  async usersWithCandidates(limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT s.user_id AS "userId"
      FROM ai_settings s JOIN users u ON u.id = s.user_id
      WHERE s.enabled AND s.meaning_search
        AND (s.embed_not_before IS NULL OR s.embed_not_before < now())
        AND EXISTS (
          SELECT 1 FROM links l
          LEFT JOIN link_embeddings e ON e.link_id = l.id AND e.user_id = l.user_id
          WHERE l.user_id = s.user_id AND l.deleted_at IS NULL
            AND (e.link_id IS NULL OR e.stale OR e.with_note <> s.include_notes
              OR e.model <> ${this.status.currentModelSql()})
        )
      LIMIT ${limit}`;
    return rows.map((row) => row.userId);
  }

  /**
   * Claims the user's lease; answers the note setting and the lease's end, which is also the token
   * that `renew` and `release` match (millisecond column), or `null` when off, leased or backing off.
   */
  private async claim(userId: string): Promise<{ includeNotes: boolean; until: Date } | null> {
    const rows = await this.prisma.$queryRaw<{ includeNotes: boolean; until: Date }[]>`
      UPDATE ai_settings
      SET embed_lease_until = now() + make_interval(secs => ${AI_EMBED_LIMIT.LeaseSeconds})
      WHERE user_id = ${userId}::uuid AND enabled AND meaning_search
        AND (embed_lease_until IS NULL OR embed_lease_until < now())
        AND (embed_not_before IS NULL OR embed_not_before < now())
      RETURNING include_notes AS "includeNotes", embed_lease_until AS until`;
    return rows[0] ?? null;
  }

  /**
   * Extends our lease before the next chunk and answers its new end; `null` once AI or the switch
   * was turned off, or when the lease expired and another pass claimed it (that pass carries on).
   */
  private async renew(userId: string, ours: Date): Promise<Date | null> {
    const rows = await this.prisma.$queryRaw<{ until: Date }[]>`
      UPDATE ai_settings
      SET embed_lease_until = now() + make_interval(secs => ${AI_EMBED_LIMIT.LeaseSeconds})
      WHERE user_id = ${userId}::uuid AND enabled AND meaning_search
        AND embed_lease_until = ${ours}
      RETURNING embed_lease_until AS until`;
    return rows[0]?.until ?? null;
  }

  /** Frees our lease only: a pass that claimed it after ours expired keeps its own. */
  private async release(userId: string, ours: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_settings SET embed_lease_until = NULL
      WHERE user_id = ${userId}::uuid AND embed_lease_until = ${ours}`;
  }

  private async chunk(
    userId: string,
    provider: EmbeddingProvider,
    tier: AiTier,
    includeNotes: boolean,
    counts: PassCounts,
  ): Promise<EmbedChunkResult> {
    const { candidates, readAt } = await this.candidates(userId, provider.model, includeNotes);
    if (candidates.length === 0) return EMBED_CHUNK_RESULT.Done;
    const tagNames = await this.tagNames(
      userId,
      candidates.map((c) => c.id),
    );
    const prepared = candidates.map((candidate) => {
      const names = tagNames.get(candidate.id) ?? [];
      const text = buildEmbeddingText({ ...candidate, tagNames: names }, includeNotes);
      const snapshot: EmbedSnapshot = {
        title: candidate.title,
        note: candidate.note,
        summary: candidate.summary,
        tags: JSON.stringify(names),
      };
      return { candidate, text, hash: embeddingTextHash(text), snapshot };
    });
    const unchanged = prepared.filter(
      ({ candidate, hash }) => candidate.inputHash === hash && candidate.model === provider.model,
    );
    if (unchanged.length > 0) {
      counts.unchanged += await this.keep(
        userId,
        unchanged.map(({ candidate }) => candidate.id),
        includeNotes,
        readAt,
      );
    }
    const changed = prepared.filter((item) => !unchanged.includes(item));
    if (changed.length === 0) return EMBED_CHUNK_RESULT.More;

    const { month, granted } = await this.usage.reserveEmbeds(userId, tier, changed.length);
    if (granted === 0) return EMBED_CHUNK_RESULT.Quota;
    const batch = changed.slice(0, granted);
    counts.calls += 1;
    const outcome = await provider.embed(
      batch.map(({ text }) => text),
      EMBEDDING_INPUT_TYPE.Document,
    );
    if (!outcome.ok || outcome.vectors.length !== batch.length) {
      await this.usage.refundEmbeds(userId, month, batch.length);
      await this.recordFailure(userId, outcome.ok ? false : outcome.retryable);
      return EMBED_CHUNK_RESULT.Failed;
    }
    let written: number;
    try {
      written = await this.write(
        userId,
        provider.model,
        includeNotes,
        readAt,
        batch.map(({ candidate, hash, snapshot }, i) => ({
          id: candidate.id,
          hash,
          snapshot,
          vector: toVectorLiteral(outcome.vectors[i] ?? []),
        })),
      );
    } catch (error) {
      // A malformed vector (wrong length, not finite) or a failed write: nothing was stored, so the
      // reservation goes back and the pass backs off like after a failed call.
      this.logger.warn(`Embed write failed (${error instanceof Error ? error.name : 'unknown'})`);
      await this.usage.refundEmbeds(userId, month, batch.length);
      await this.recordFailure(userId, false);
      return EMBED_CHUNK_RESULT.Failed;
    }
    counts.embedded += written;
    await this.recordSuccess(userId);
    return granted < changed.length ? EMBED_CHUNK_RESULT.Quota : EMBED_CHUNK_RESULT.More;
  }

  /** Up to one chunk of candidates, newest first, and the database time they were read at. */
  private async candidates(
    userId: string,
    model: string,
    includeNotes: boolean,
  ): Promise<{ candidates: EmbedCandidate[]; readAt: Date }> {
    const rows = await this.prisma.$queryRaw<(EmbedCandidate & { readAt: Date })[]>`
      SELECT l.id::text AS id, l.title, l.note, l.summary, e.input_hash AS "inputHash", e.model,
        clock_timestamp() AS "readAt"
      FROM links l
      LEFT JOIN link_embeddings e ON e.link_id = l.id AND e.user_id = l.user_id
      WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NULL
        AND (e.link_id IS NULL OR e.stale OR e.model <> ${model} OR e.with_note <> ${includeNotes})
        AND NOT EXISTS (
          SELECT 1 FROM ai_jobs j
          WHERE j.user_id = ${userId}::uuid AND j.link_id = l.id
            AND j.status IN (${AI_JOB_STATE.Pending}, ${AI_JOB_STATE.Running})
        )
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${AI_EMBED_LIMIT.ChunkSize}`;
    const readAt = rows[0]?.readAt ?? new Date();
    return {
      candidates: rows.map((row) => ({
        id: row.id,
        title: row.title,
        note: row.note,
        summary: row.summary,
        inputHash: row.inputHash,
        model: row.model,
      })),
      readAt,
    };
  }

  private async tagNames(
    userId: string,
    linkIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const rows = await this.prisma.$queryRaw<{ linkId: string; name: string }[]>`
      SELECT lt.link_id::text AS "linkId", t.name
      FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
      WHERE t.user_id = ${userId}::uuid AND lt.link_id = ANY(${[...linkIds]}::uuid[])`;
    const names = new Map<string, string[]>();
    for (const row of rows) names.set(row.linkId, [...(names.get(row.linkId) ?? []), row.name]);
    return names;
  }

  /**
   * Guards every vector write: AI and search by meaning must still be on when the row is written, so
   * "Delete AI data" or a switch turned off during the provider call leaves nothing behind. `FOR
   * SHARE` serialises with those writers, which lock the settings row first (`AiDataService` turns
   * the switch off before it deletes the vectors): either the write waits and then sees the switch
   * off, or the delete waits and then removes what was written.
   */
  private searchStillOn(userId: string): Prisma.Sql {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM ai_settings s
      WHERE s.user_id = ${userId}::uuid AND s.enabled AND s.meaning_search
      FOR SHARE)`;
  }

  /**
   * Unchanged texts: the vector stays, only the flags move. A row flagged stale again after the
   * candidates were read keeps its flag; nothing moves once AI or the switch is off.
   */
  private async keep(
    userId: string,
    linkIds: readonly string[],
    includeNotes: boolean,
    readAt: Date,
  ): Promise<number> {
    return this.prisma.$executeRaw`
      UPDATE link_embeddings SET stale = false, with_note = ${includeNotes}
      WHERE user_id = ${userId}::uuid AND link_id = ANY(${[...linkIds]}::uuid[])
        AND updated_at <= ${readAt} AND ${this.searchStillOn(userId)}`;
  }

  /**
   * One set-based upsert for the chunk: only links that are still the user's and live get a row; a
   * link whose title, note, summary or tags differ from what was sent (compared with the current rows
   * in the same statement, so a change with no vector row yet to flag counts too), that was edited
   * during the call (its `updated_at` moved past `readAt`) or that was flagged stale meanwhile is
   * stored as stale, so the next pass rebuilds it; nothing is written once AI or the switch is off
   * (`searchStillOn`). Vectors are bound parameters cast to `halfvec`.
   */
  private async write(
    userId: string,
    model: string,
    includeNotes: boolean,
    readAt: Date,
    rows: readonly { id: string; hash: string; snapshot: EmbedSnapshot; vector: string }[],
  ): Promise<number> {
    return this.prisma.$executeRaw`
      INSERT INTO link_embeddings
        (link_id, user_id, model, with_note, input_hash, stale, embedding, created_at, updated_at)
      SELECT l.id, l.user_id, ${model}, ${includeNotes}, v.hash,
        l.updated_at > ${readAt}
          OR l.title IS DISTINCT FROM v.title
          OR l.note IS DISTINCT FROM v.note
          OR l.summary IS DISTINCT FROM v.summary
          OR ARRAY(SELECT x FROM json_array_elements_text(v.tags::json) AS x ORDER BY x)
            <> ARRAY(
              SELECT t.name::text FROM link_tags lt JOIN tags t ON t.id = lt.tag_id
              WHERE lt.link_id = l.id AND t.user_id = ${userId}::uuid ORDER BY t.name),
        v.vector::halfvec, now(), now()
      FROM unnest(
        ${rows.map((row) => row.id)}::uuid[],
        ${rows.map((row) => row.hash)}::text[],
        ${rows.map((row) => row.vector)}::text[],
        ${rows.map((row) => row.snapshot.title)}::text[],
        ${rows.map((row) => row.snapshot.note)}::text[],
        ${rows.map((row) => row.snapshot.summary)}::text[],
        ${rows.map((row) => row.snapshot.tags)}::text[]
      ) AS v(id, hash, vector, title, note, summary, tags)
      JOIN links l ON l.id = v.id
      WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NULL AND ${this.searchStillOn(userId)}
      ON CONFLICT (link_id) DO UPDATE SET
        model = EXCLUDED.model,
        with_note = EXCLUDED.with_note,
        input_hash = EXCLUDED.input_hash,
        stale = EXCLUDED.stale
          OR (link_embeddings.stale AND link_embeddings.updated_at > ${readAt}),
        embedding = EXCLUDED.embedding,
        updated_at = now()
      WHERE link_embeddings.user_id = EXCLUDED.user_id`;
  }

  /**
   * Backs off 30 s / 2 min / 10 min by failures in a row; the status reads `unavailable` meanwhile.
   * A failure that cannot be retried, once `NonRetryableMax` failures are in a row, backs off for
   * `NonRetryableBackoffSeconds` instead, and warns once when it first gets there (a broken key or
   * request needs a person, not a retry every ten minutes).
   */
  private async recordFailure(userId: string, retryable: boolean): Promise<void> {
    const steps = AI_EMBED_LIMIT.BackoffSeconds;
    const max = AI_EMBED_LIMIT.NonRetryableMax;
    const rows = await this.prisma.$queryRaw<{ failures: number }[]>`
      UPDATE ai_settings
      SET embed_failures = LEAST(embed_failures + 1, 100), embed_failed_at = now(),
        embed_not_before = now() + make_interval(secs => CASE
          WHEN ${!retryable} AND embed_failures + 1 >= ${max}::int
            THEN ${AI_EMBED_LIMIT.NonRetryableBackoffSeconds}::int
          ELSE (${[...steps]}::int[])[LEAST(embed_failures + 1, ${steps.length}::int)]
        END)
      WHERE user_id = ${userId}::uuid
      RETURNING embed_failures::int AS failures`;
    const failures = rows[0]?.failures ?? 0;
    if (!retryable && failures === max) {
      this.logger.warn(
        `Embed calls failed ${max} times in a row and cannot be retried; the pass waits ${AI_EMBED_LIMIT.NonRetryableBackoffSeconds / 3600} h`,
      );
    } else if (retryable || failures < max) {
      this.logger.warn('Embed call failed; the pass backs off');
    }
  }

  private async recordSuccess(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_settings SET embed_failures = 0, embed_failed_at = NULL, embed_not_before = NULL
      WHERE user_id = ${userId}::uuid AND (embed_failures > 0 OR embed_failed_at IS NOT NULL)`;
  }
}
